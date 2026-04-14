import WorldClock from './WorldClock'
import MiniCalendar from './MiniCalendar'

export default function RightSidebar() {
  return (
    <aside className="hidden 2xl:flex w-64 flex-shrink-0 flex-col gap-4 p-4 sticky top-[5.5rem] self-start" style={{ height: 'max-content' }}>
       <WorldClock />
       <MiniCalendar />
    </aside>
  )
}
