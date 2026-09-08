/**
 * Contrats publics consommés par le front.
 *
 * Ils sont réexportés depuis le backend Express afin que le client ne dépende
 * jamais de la couche HTTP. Comme ce sont uniquement des
 * imports de type, aucun code serveur n'est embarqué dans le bundle web.
 */
export type { PublicUser } from '../../backend/src/services/userService'
export type {
  CertificationEntry,
  FormationEntry,
  Mobility,
  PayoutMethod,
  ProviderProfile,
} from '../../backend/src/services/providerProfileService'
export type {
  FeaturedProviderResult,
  ProviderDetail,
  ProviderSearchResult,
} from '../../backend/src/services/providerDirectoryService'
export type {
  ConversationSummary,
} from '../../backend/src/services/conversationService'
export type {
  Message,
} from '../../backend/src/repositories/conversationRepository'
export type { EscrowOrder } from '../../backend/src/repositories/escrowOrderRepository'
export type {
  RecurringFrequency,
  RecurringService,
} from '../../backend/src/services/recurringServiceService'
export type {
  WalletMovement,
  WalletMovementType,
} from '../../backend/src/repositories/walletMovementRepository'
export type { Payment } from '../../backend/src/repositories/paymentRepository'
export type { Subscription } from '../../backend/src/services/subscriptionService'
export type { Notification } from '../../backend/src/services/notificationService'
export type {
  MatchedProvider,
  ProviderMatchedRequest,
  ServiceRequest,
} from '../../backend/src/services/requestService'
export type { Urgency } from '../../backend/src/services/matchingEngine'
export type {
  Testimonial,
  TestimonialRole,
} from '../../backend/src/services/testimonialService'
export type { UnavailabilityPeriod } from '../../backend/src/services/availabilityService'

/** Réponse de `GET /api/sectors/counts`. */
export interface SectorCount {
  slug: string
  count: number
}
