export interface SubSector {
  name: string
  icon?: string
}

export interface Sector {
  slug: string
  name: string
  emoji: string
  color: string
  ink: string
  subSectors: SubSector[]
}

export const SECTORS: Sector[] = [
  {
    slug: 'btp',
    name: 'Artisanat & BTP',
    emoji: '🔨',
    color: '#D97706',
    ink: '#1A1A1A',
    subSectors: [
      { name: 'Menuiserie', icon: '/images/sectors/menuiserie.png' },
      { name: 'Maçonnerie', icon: '/images/sectors/maconnerie.png' },
      { name: 'Plomberie', icon: '/images/sectors/plomberie.png' },
      { name: 'Électricité', icon: '/images/sectors/electricite.png' },
      { name: 'Peinture & décoration', icon: '/images/sectors/peinture.png' },
      { name: 'Soudure & métallerie' },
    ],
  },
  {
    slug: 'digital',
    name: 'Informatique & Digital',
    emoji: '💻',
    color: '#2563EB',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Développement web & mobile' },
      { name: 'Réparation ordinateurs/téléphones' },
      { name: 'Marketing digital' },
      { name: 'Graphisme & design' },
      { name: 'Formation informatique' },
    ],
  },
  {
    slug: 'menage',
    name: 'Ménage & Maison',
    emoji: '🧹',
    color: '#14A800',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Ménage à domicile', icon: '/images/sectors/menage.png' },
      { name: 'Repassage' },
      { name: 'Jardinage', icon: '/images/sectors/jardinage.png' },
      { name: "Garde d'enfants" },
      { name: 'Cuisine à domicile' },
    ],
  },
  {
    slug: 'beaute',
    name: 'Beauté & Bien-être',
    emoji: '💇',
    color: '#DB2777',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Coiffure' },
      { name: 'Esthétique & soins' },
      { name: 'Manucure & pédicure' },
      { name: 'Massage' },
      { name: 'Maquillage événementiel' },
    ],
  },
  {
    slug: 'evenement',
    name: 'Événementiel',
    emoji: '🎉',
    color: '#7C3AED',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Traiteur' },
      { name: 'Décoration de salle' },
      { name: 'DJ & sonorisation' },
      { name: 'Photographie & vidéo' },
      { name: 'Location de matériel' },
    ],
  },
  {
    slug: 'education',
    name: 'Éducation & Cours',
    emoji: '📚',
    color: '#4F46E5',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Soutien scolaire' },
      { name: 'Cours de langues' },
      { name: 'Cours de musique' },
      { name: 'Formation professionnelle' },
      { name: 'Coaching' },
    ],
  },
  {
    slug: 'transport',
    name: 'Transport & Livraison',
    emoji: '🚚',
    color: '#EA580C',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Livraison de colis' },
      { name: 'Déménagement' },
      { name: 'Location véhicule avec chauffeur' },
      { name: 'Course moto' },
    ],
  },
  {
    slug: 'commerce',
    name: 'Commerce',
    emoji: '🛍️',
    color: '#0E7490',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Vente en gros' },
      { name: 'Import-export' },
      { name: 'Boutique en ligne' },
      { name: 'Distribution & revente' },
    ],
  },
  {
    slug: 'industrie',
    name: 'Industrie',
    emoji: '🏭',
    color: '#57534E',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Fabrication métallique' },
      { name: 'Agroalimentaire' },
      { name: 'Textile & couture' },
      { name: 'Maintenance industrielle' },
    ],
  },
  {
    slug: 'sante',
    name: 'Santé & Bien-être',
    emoji: '🩺',
    color: '#DC2626',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Aide-soignant à domicile' },
      { name: 'Kinésithérapie' },
      { name: 'Nutrition & diététique' },
      { name: 'Sage-femme à domicile' },
    ],
  },
]
