export interface PropertyPhotoOption {
  id: string;
  label: string;
  category: 'Commercial' | 'Residential';
  url: string;
  description: string;
}

export const CURATED_PROPERTY_PHOTOS: PropertyPhotoOption[] = [
  // Commercial (5)
  {
    id: 'commercial-office',
    label: 'Modern Glass Office',
    category: 'Commercial',
    url: '/images/properties/commercial-office.jpg',
    description: 'Corporate glass building & commercial suites',
  },
  {
    id: 'commercial-tower',
    label: 'High-Rise Tower',
    category: 'Commercial',
    url: '/images/properties/commercial-tower.jpg',
    description: 'Downtown CBD skyscraper & corporate offices',
  },
  {
    id: 'commercial-retail',
    label: 'Retail Storefront',
    category: 'Commercial',
    url: '/images/properties/commercial-retail.jpg',
    description: 'Boutique streetfront, restaurant & retail showroom',
  },
  {
    id: 'commercial-warehouse',
    label: 'Industrial Warehouse',
    category: 'Commercial',
    url: '/images/properties/commercial-warehouse.jpg',
    description: 'Distribution hub, storage & logistics park',
  },
  {
    id: 'commercial-studio',
    label: 'Creative Studio',
    category: 'Commercial',
    url: '/images/properties/commercial-studio.jpg',
    description: 'Modern co-working, agency & tech studio',
  },

  // Residential (5)
  {
    id: 'residential-townhouse',
    label: 'Modern Townhouse',
    category: 'Residential',
    url: '/images/properties/residential-townhouse.jpg',
    description: 'Architectural multi-level townhouse & duplex',
  },
  {
    id: 'residential-apartment',
    label: 'Luxury Apartment',
    category: 'Residential',
    url: '/images/properties/residential-apartment.jpg',
    description: 'High-rise residential tower & balconies',
  },
  {
    id: 'residential-house',
    label: 'Suburban Family Home',
    category: 'Residential',
    url: '/images/properties/residential-house.jpg',
    description: 'Standalone house with garden & driveway',
  },
  {
    id: 'residential-coastal',
    label: 'Coastal Villa',
    category: 'Residential',
    url: '/images/properties/residential-coastal.jpg',
    description: 'Beachside contemporary villa & pool',
  },
  {
    id: 'residential-loft',
    label: 'Urban Loft / Unit',
    category: 'Residential',
    url: '/images/properties/residential-loft.jpg',
    description: 'Inner-city loft, apartment & boutique flats',
  },
];

export function getDefaultPropertyPhoto(category?: string | null, type?: string | null): string {
  if (category === 'Commercial') {
    const t = (type || '').toLowerCase();
    if (t.includes('warehouse') || t.includes('industrial') || t.includes('logistics')) {
      return '/images/properties/commercial-warehouse.jpg';
    }
    if (t.includes('retail') || t.includes('shop') || t.includes('store')) {
      return '/images/properties/commercial-retail.jpg';
    }
    if (t.includes('studio') || t.includes('co-working')) {
      return '/images/properties/commercial-studio.jpg';
    }
    return '/images/properties/commercial-office.jpg';
  }

  const t = (type || '').toLowerCase();
  if (t.includes('apartment') || t.includes('flat') || t.includes('unit')) {
    return '/images/properties/residential-apartment.jpg';
  }
  if (t.includes('house') || t.includes('home')) {
    return '/images/properties/residential-house.jpg';
  }
  return '/images/properties/residential-townhouse.jpg';
}
