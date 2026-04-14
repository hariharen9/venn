import SystemIndicators from './SystemIndicators'
import DataTicker from './DataTicker'

export default function LeftSidebar() {
  return (
    <aside className="hidden xl:flex w-64 flex-shrink-0 flex-col gap-4 p-4 sticky top-[5.5rem] self-start" style={{ height: 'max-content' }}>
       <SystemIndicators />
       <DataTicker />
    </aside>
  )
}
