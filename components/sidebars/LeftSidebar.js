import SystemIndicators from './SystemIndicators'
import DataTicker from './DataTicker'
import WeatherWidget from './WeatherWidget'
import MarketWatch from './MarketWatch'

export default function LeftSidebar() {
  return (
    <aside 
      className="hidden xl:flex w-64 flex-shrink-0 flex-col gap-4 p-4 sticky top-[5.5rem] overflow-y-auto custom-sidebar-scroll" 
      style={{ height: 'calc(100vh - 6rem)' }}
    >
       <SystemIndicators />
       <WeatherWidget />
       <MarketWatch />
       <DataTicker />
    </aside>
  )
}
