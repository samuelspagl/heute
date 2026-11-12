import { createCalendarEventsHandler } from '../../utils/homeassistant/handler'
import { calendarHandlerDeps } from '../../utils/homeassistant/runtime'

export default createCalendarEventsHandler(calendarHandlerDeps())
