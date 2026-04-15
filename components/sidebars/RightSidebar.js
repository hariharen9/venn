import WorldClock from './WorldClock'
import GithubWidget from './GithubWidget'
import SpaceWatch from './SpaceWatch'

export default function RightSidebar() {
  return (
    <aside 
      className="hidden 2xl:flex w-64 flex-shrink-0 flex-col gap-4 p-4 sticky top-[5.5rem] overflow-y-auto custom-sidebar-scroll" 
      style={{ height: 'calc(100vh - 6rem)' }}
    >
       <WorldClock />
       <GithubWidget username="hariharen9" />
       <SpaceWatch />
    </aside>
  )
}
