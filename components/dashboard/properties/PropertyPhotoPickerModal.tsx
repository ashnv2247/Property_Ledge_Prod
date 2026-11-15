'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Check, X, Camera, Building2, Home } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { CURATED_PROPERTY_PHOTOS, PropertyPhotoOption } from './property-photos';

export interface PropertyPhotoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (photoUrl: string) => Promise<void> | void;
  currentPhotoUrl?: string | null;
  propertyName?: string | null;
  initialCategory?: 'Commercial' | 'Residential' | 'all';
  categoryFilter?: 'Commercial' | 'Residential' | 'all';
}

export function PropertyPhotoPickerModal({
  isOpen,
  onClose,
  onSelectPhoto,
  currentPhotoUrl,
  propertyName = 'Property',
  initialCategory = 'all',
  categoryFilter,
}: PropertyPhotoPickerModalProps) {
  const defaultCategory = categoryFilter || initialCategory;
  const [selectedUrl, setSelectedUrl] = useState<string>(
    currentPhotoUrl || CURATED_PROPERTY_PHOTOS[0].url
  );
  const [filterTab, setFilterTab] = useState<'all' | 'Commercial' | 'Residential'>(defaultCategory);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentPhotoUrl) {
        setSelectedUrl(currentPhotoUrl);
      } else if (initialCategory !== 'all') {
        const matching = CURATED_PROPERTY_PHOTOS.find((p) => p.category === initialCategory);
        if (matching) setSelectedUrl(matching.url);
      }
      setFilterTab(initialCategory);
    }
  }, [isOpen, currentPhotoUrl, initialCategory]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPhotos =
    filterTab === 'all'
      ? CURATED_PROPERTY_PHOTOS
      : CURATED_PROPERTY_PHOTOS.filter((p) => p.category === filterTab);

  const activePhoto =
    CURATED_PROPERTY_PHOTOS.find((p) => p.url === selectedUrl) ||
    CURATED_PROPERTY_PHOTOS[0];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSelectPhoto(selectedUrl);
      onClose();
    } catch (err) {
      console.error('Failed to save property photo choice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-photo-picker-title"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#07111F] border border-slate-200 dark:border-[#17283A] rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#17283A] pb-3.5 shrink-0">
          <div>
            <h2
              id="property-photo-picker-title"
              className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-heading flex items-center gap-2"
            >
              <Camera className="w-5 h-5 text-[#008F83]" />
              Select Property Photo
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              Choose from 10 curated architectural photos for {propertyName || 'your property'}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Preview Banner */}
        <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-[#0B1726] border border-slate-200/80 dark:border-[#17283A] shrink-0">
          <div className="relative w-24 h-16 sm:w-28 sm:h-18 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 shadow-xs">
            <Image
              src={selectedUrl}
              alt={activePhoto.label}
              fill
              className="object-cover"
              sizes="120px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                {activePhoto.category}
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {activePhoto.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate mt-1">
              {activePhoto.description}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#08182A] border border-slate-200/60 dark:border-white/5 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              filterTab === 'all'
                ? 'bg-white dark:bg-[#008F83] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-[#8FA3B8] hover:text-slate-900 dark:hover:text-white'
            )}
          >
            All (10)
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('Commercial')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              filterTab === 'Commercial'
                ? 'bg-white dark:bg-[#008F83] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-[#8FA3B8] hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            Commercial (5)
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('Residential')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              filterTab === 'Residential'
                ? 'bg-white dark:bg-[#008F83] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-[#8FA3B8] hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Home className="w-3.5 h-3.5" />
            Residential (5)
          </button>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto p-1 custom-scrollbar flex-1 min-h-[220px]">
          {filteredPhotos.map((photo: PropertyPhotoOption) => {
            const isSelected = selectedUrl === photo.url;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedUrl(photo.url)}
                className={cn(
                  'group relative rounded-2xl overflow-hidden border text-left transition-all duration-150 cursor-pointer flex flex-col',
                  isSelected
                    ? 'border-[#008F83] ring-2 ring-[#008F83] shadow-md shadow-[#008F83]/20'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:scale-[1.02]'
                )}
              >
                <div className="relative w-full aspect-[16/10] bg-slate-100 dark:bg-slate-800">
                  <Image
                    src={photo.url}
                    alt={photo.label}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#008F83] text-white flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-bold">
                    {photo.category}
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-[#0B1726] flex-1 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                    {photo.label}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] line-clamp-1 mt-0.5">
                    {photo.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-[#17283A] shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#008F83] hover:bg-[#007A70] text-white text-xs font-bold px-5"
          >
            {isSaving ? 'Saving...' : 'Apply Photo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
