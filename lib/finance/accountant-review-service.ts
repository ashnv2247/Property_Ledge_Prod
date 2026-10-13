/**
 * Accountant Review Service
 * 
 * Provides parsing, serialization, and status resolution for persistent
 * accountant review decisions (Verified, Needs Review, Disputed) and notes.
 * Stores review records safely inside the transaction notes column without requiring
 * disruptive table alterations, maintaining 100% database compatibility and RLS integrity.
 */

export type AccountantReviewStatus = 'unreviewed' | 'verified' | 'needs_review' | 'disputed';

export interface AccountantReviewRecord {
  status: AccountantReviewStatus;
  notes: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface ParsedTransactionNotes {
  review: AccountantReviewRecord;
  userNotes: string;
}

const REVIEW_REGEX = /\[ACCOUNTANT_REVIEW:\s*(\{[\s\S]*?\})\]/;

/**
 * Parses raw transaction notes to extract structured accountant review decisions
 * and separate them from general user notes.
 */
export function parseAccountantReviewFromNotes(rawNotes: string | null | undefined): ParsedTransactionNotes {
  if (!rawNotes || typeof rawNotes !== 'string') {
    return {
      review: { status: 'unreviewed', notes: '', reviewedBy: null, reviewedAt: null },
      userNotes: '',
    };
  }

  const match = rawNotes.match(REVIEW_REGEX);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      const validStatuses: AccountantReviewStatus[] = ['verified', 'needs_review', 'disputed'];
      const status: AccountantReviewStatus = validStatuses.includes(parsed.status)
        ? parsed.status
        : 'unreviewed';

      const userNotes = rawNotes.replace(REVIEW_REGEX, '').trim();

      return {
        review: {
          status,
          notes: typeof parsed.notes === 'string' ? parsed.notes : '',
          reviewedBy: parsed.reviewedBy || null,
          reviewedAt: parsed.reviewedAt || null,
        },
        userNotes,
      };
    } catch {
      // In case of JSON parse failure, fallback gracefully
      return {
        review: { status: 'unreviewed', notes: '', reviewedBy: null, reviewedAt: null },
        userNotes: rawNotes.replace(REVIEW_REGEX, '').trim(),
      };
    }
  }

  return {
    review: { status: 'unreviewed', notes: '', reviewedBy: null, reviewedAt: null },
    userNotes: rawNotes.trim(),
  };
}

/**
 * Serializes accountant review decisions and notes back into transaction notes.
 * Preserves existing user notes while updating or setting the review block.
 */
export function serializeAccountantReviewToNotes(
  review: AccountantReviewRecord,
  existingUserNotes: string = ''
): string {
  const payload = {
    status: review.status,
    notes: (review.notes || '').trim(),
    reviewedBy: review.reviewedBy || null,
    reviewedAt: review.reviewedAt || new Date().toISOString(),
  };

  const header = `[ACCOUNTANT_REVIEW: ${JSON.stringify(payload)}]`;
  const { userNotes: cleanUserNotes } = parseAccountantReviewFromNotes(existingUserNotes);

  return cleanUserNotes ? `${header}\n${cleanUserNotes}` : header;
}
