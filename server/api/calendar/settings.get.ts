import { createCalendarSettingsGetHandler } from '../../utils/homeassistant/handler'
import { calendarHandlerDeps } from '../../utils/homeassistant/runtime'

export default createCalendarSettingsGetHandler(calendarHandlerDeps())
