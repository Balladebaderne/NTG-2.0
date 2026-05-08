export const serviceCards = [
  {
    description: 'Daily road freight for Nordic and European distribution with clear status milestones.',
    image: 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&w=900&q=80',
    title: 'Road freight',
  },
  {
    description: 'Container and consolidated ocean freight with route visibility from port to consignee.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    title: 'Ocean freight',
  },
  {
    description: 'Time-sensitive air shipments with event-driven updates for customer teams.',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80',
    title: 'Air freight',
  },
  {
    description: 'Express handling for urgent shipments where response time and ETA clarity matter.',
    image: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&w=900&q=80',
    title: 'Express',
  },
  {
    description: 'Operational support for oversized, complex, and project-based transport flows.',
    image: 'https://images.unsplash.com/photo-1581093458791-9d42cc030d6d?auto=format&fit=crop&w=900&q=80',
    title: 'Project transport',
  },
  {
    description: 'Customs coordination and document control for cross-border shipment execution.',
    image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=900&q=80',
    title: 'Customs',
  },
  {
    description: 'Structured furniture logistics with shipment, route, and delivery event visibility.',
    image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=80',
    title: 'Furniture logistics',
  },
  {
    description: 'Warehouse and terminal handling connected to customer shipment overviews.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
    title: 'Warehouse logistics',
  },
]

export const supportCards = [
  {
    detail: 'Shipment status, ETA, and latest event support for customers.',
    title: 'Customer service',
  },
  {
    detail: 'Escalation handling for delays, missing events, and data discrepancies.',
    title: 'Exception desk',
  },
  {
    detail: 'Operational updates from drivers and route teams across active shipments.',
    title: 'Transport operations',
  },
]

export const publicTimeline = [
  {
    eventLabel: 'Pickup confirmed',
    location: { label: 'Copenhagen, Denmark' },
    notes: 'Goods loaded and pickup registered by driver.',
    occurredAt: '2026-05-08T08:20:00.000Z',
    trackingEventId: 'public-1',
  },
  {
    eventLabel: 'Border crossed',
    location: { label: 'Padborg, Denmark' },
    notes: 'Shipment moved into the international transport leg.',
    occurredAt: '2026-05-08T11:40:00.000Z',
    trackingEventId: 'public-2',
  },
  {
    eventLabel: 'Arriving terminal',
    location: { label: 'Hamburg, Germany' },
    notes: 'ETA remains within the planned delivery window.',
    occurredAt: '2026-05-08T15:10:00.000Z',
    trackingEventId: 'public-3',
  },
]

export const trackingMilestones = [
  { label: 'Pickup confirmed', value: 'goods_loaded_pickup_confirmed' },
  { label: 'Departed terminal', value: 'departed_origin_terminal' },
  { label: 'Arrived terminal', value: 'arrived_destination_terminal' },
  { label: 'Border crossed', value: 'in_transit_milestone' },
  { label: 'Delay reported', value: 'delay_logged' },
  { label: 'Delivered', value: 'goods_delivered' },
  { label: 'Location update', value: 'location_updated' },
  { label: 'Exception reported', value: 'exception_logged' },
]
