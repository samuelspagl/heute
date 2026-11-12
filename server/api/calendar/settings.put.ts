import { createCalendarSettingsPutHandler } from '../../utils/homeassistant/handler'
import { calendarHandlerDeps } from '../../utils/homeassistant/runtime'

export default createCalendarSettingsPutHandler(calendarHandlerDeps())
