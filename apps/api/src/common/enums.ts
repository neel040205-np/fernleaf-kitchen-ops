export enum Role {
  ADMIN = 'ADMIN',
  KITCHEN = 'KITCHEN',
  DISPATCH = 'DISPATCH',
  DRIVER = 'DRIVER',
}

export enum DishTemperature {
  HOT = 'HOT',
  COLD = 'COLD',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum PrepUnitStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  DONE = 'DONE',
}

export enum DropStatus {
  PENDING = 'PENDING',
  DISPATCH_READY = 'DISPATCH_READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
}

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
}

export enum TierDerivationType {
  NONE = 'NONE',
  MULTIPLIER_OF_COST = 'MULTIPLIER_OF_COST',
  PERCENTAGE_OF_TIER = 'PERCENTAGE_OF_TIER',
}
