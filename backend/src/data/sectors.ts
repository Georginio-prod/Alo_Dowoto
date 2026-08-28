export interface SubSector {
  name: string
}

/** Nom d'icône Lucide (voir app/utils/sectorIcons.ts pour le composant réel). */
export type SectorIcon =
  | 'hammer'
  | 'laptop'
  | 'sparkles'
  | 'scissors'
  | 'party-popper'
  | 'book-open'
  | 'truck'
  | 'shopping-bag'
  | 'factory'
  | 'stethoscope'

export interface Sector {
  slug: string
  name: string
  emoji: string
  icon: SectorIcon
  /** Texte alternatif de la photo bannière (categories/[slug].vue) — décrit la scène, pas le secteur. */
  photoAlt: string
  /** `object-position` CSS pour la photo bannière — corrige le recadrage `object-cover` quand le sujet n'est pas centré verticalement. */
  photoPosition?: string
  color: string
  ink: string
  subSectors: SubSector[]
}

export const SECTORS: Sector[] = [
  {
    slug: 'btp',
    name: 'Artisanat & BTP',
    emoji: '🔨',
    icon: 'hammer',
    photoAlt: 'Électricien en intervention sur un tableau électrique, gants et casque de protection',
    photoPosition: 'center 25%',
    color: '#D97706',
    ink: '#1A1A1A',
    subSectors: [
      { name: 'Menuiserie' },
      { name: 'Maçonnerie' },
      { name: 'Plomberie' },
      { name: 'Électricité' },
      { name: 'Peinture & décoration' },
      { name: 'Soudure & métallerie' },
    ],
  },
  {
    slug: 'digital',
    name: 'Informatique & Digital',
    emoji: '💻',
    icon: 'laptop',
    photoAlt: 'Développeur travaillant sur plusieurs écrans de code',
    photoPosition: 'center 38%',
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
    icon: 'sparkles',
    photoAlt: 'Femme de ménage passant la serpillère dans un salon lumineux',
    color: '#14A800',
    ink: '#FFFFFF',
    subSectors: [
      { name: 'Ménage à domicile' },
      { name: 'Repassage' },
      { name: 'Jardinage' },
      { name: "Garde d'enfants" },
      { name: 'Cuisine à domicile' },
    ],
  },
  {
    slug: 'beaute',
    name: 'Beauté & Bien-être',
    emoji: '💇',
    icon: 'scissors',
    photoAlt: 'Coiffeuse rinçant les cheveux d\'une cliente au bac de lavage',
    photoPosition: 'center 75%',
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
    icon: 'party-popper',
    photoAlt: 'Table dressée avec un centre de table floral pour un événement',
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
    icon: 'book-open',
    photoAlt: 'Enseignante faisant la lecture à des enfants dans une bibliothèque',
    photoPosition: 'center 22%',
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
    icon: 'truck',
    photoAlt: 'Livreur transportant des colis en pleine rue',
    photoPosition: 'center 20%',
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
    icon: 'shopping-bag',
    photoAlt: 'Employés manipulant des cartons dans un entrepôt de stockage',
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
    icon: 'factory',
    photoAlt: 'Soudeur au travail avec masque de protection et projections d\'étincelles',
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
    icon: 'stethoscope',
    photoAlt: 'Soignante souriante auprès d\'une patiente âgée à domicile',
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
