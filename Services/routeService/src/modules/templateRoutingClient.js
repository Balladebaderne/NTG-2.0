const { v4: uuidv4 } = require('uuid')

const TEMPLATE_INTERMEDIATE_STOPS = [
  {
    type: 'origin_terminal',
    address: { street: null, city: 'Hamburg', postalCode: null, country: 'DE' },
    location: { lat: 53.5511, lng: 9.9937, label: 'Hamburg Terminal' },
    plannedArrivalAt: null,
    plannedDepartureAt: null,
    notes: 'Template stop: origin terminal',
    metadata: { source: 'template' },
  },
  {
    type: 'border_crossing',
    address: { street: null, city: 'Flensburg', postalCode: null, country: 'DE' },
    location: { lat: 54.7833, lng: 9.4333, label: 'DE/DK Border Crossing' },
    plannedArrivalAt: null,
    plannedDepartureAt: null,
    notes: 'Template stop: border crossing DE/DK',
    metadata: { source: 'template' },
  },
  {
    type: 'hub',
    address: { street: null, city: 'Kolding', postalCode: null, country: 'DK' },
    location: { lat: 55.4904, lng: 9.4721, label: 'Kolding Relay Hub' },
    plannedArrivalAt: null,
    plannedDepartureAt: null,
    notes: 'Template stop: relay hub',
    metadata: { source: 'template' },
  },
  {
    type: 'destination_terminal',
    address: { street: null, city: 'Copenhagen', postalCode: null, country: 'DK' },
    location: { lat: 55.6761, lng: 12.5683, label: 'Copenhagen Terminal' },
    plannedArrivalAt: null,
    plannedDepartureAt: null,
    notes: 'Template stop: destination terminal',
    metadata: { source: 'template' },
  },
]

function getTemplateIntermediateStops() {
  return TEMPLATE_INTERMEDIATE_STOPS.map((stop) => ({
    ...stop,
    stopId: uuidv4(),
  }))
}

module.exports = { getTemplateIntermediateStops }
