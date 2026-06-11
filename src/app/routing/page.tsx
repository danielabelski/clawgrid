import { getRegistry } from '@/lib/instances'
import { ModelRoutingPanel } from '@/components/routing/ModelRoutingPanel'

export default async function RoutingPage() {
  const { instances } = getRegistry()
  return <ModelRoutingPanel instances={instances} />
}
