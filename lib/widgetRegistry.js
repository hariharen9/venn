import CinemaWidget from '../components/CinemaWidget'
import BriefingWidget from '../components/BriefingWidget'
import ErrorWidget from '../components/ErrorWidget'

export const WIDGET_REGISTRY = {
  cinema: CinemaWidget,
  briefing: BriefingWidget,
  error: ErrorWidget,
}

export function getWidgetComponent(type) {
  return WIDGET_REGISTRY[type] || WIDGET_REGISTRY.briefing
}

export function detectWidgetType(data) {
  if (!data) return 'briefing'
  if (data.ww_gross || data.runtime || data.director) return 'cinema'
  if (data.key_points || data.summary) return 'briefing'
  return 'briefing'
}