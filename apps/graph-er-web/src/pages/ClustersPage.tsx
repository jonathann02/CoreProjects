import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import cytoscape from 'cytoscape'
import coseBilkent from 'cytoscape-cose-bilkent'
import { Network, Settings, Eye, EyeOff } from 'lucide-react'

// Register Cytoscape extensions
cytoscape.use(coseBilkent)

interface ClusterNode {
  id: string
  name: string
  type: 'golden' | 'source'
  clusterId?: string
}

interface ClusterEdge {
  source: string
  target: string
  weight: number
  type: 'match' | 'merge'
}

export default function ClustersPage() {
  const [searchParams] = useSearchParams()
  const cytoscapeRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selectedNode, setSelectedNode] = useState<ClusterNode | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [layout, setLayout] = useState('cose-bilkent')

  // Mock data - replace with real API calls
  const mockData = {
    nodes: [
      { id: 'golden-1', name: 'John Smith', type: 'golden' as const, clusterId: 'cluster-1' },
      { id: 'golden-2', name: 'Jane Doe', type: 'golden' as const, clusterId: 'cluster-2' },
      { id: 'source-1', name: 'John Smith', type: 'source' as const, clusterId: 'cluster-1' },
      { id: 'source-2', name: 'J. Smith', type: 'source' as const, clusterId: 'cluster-1' },
      { id: 'source-3', name: 'Johnny Smith', type: 'source' as const, clusterId: 'cluster-1' },
      { id: 'source-4', name: 'Jane Doe', type: 'source' as const, clusterId: 'cluster-2' },
      { id: 'source-5', name: 'Jane D.', type: 'source' as const, clusterId: 'cluster-2' },
    ] as ClusterNode[],
    edges: [
      { source: 'source-1', target: 'golden-1', weight: 0.95, type: 'merge' as const },
      { source: 'source-2', target: 'golden-1', weight: 0.87, type: 'merge' as const },
      { source: 'source-3', target: 'golden-1', weight: 0.92, type: 'merge' as const },
      { source: 'source-1', target: 'source-2', weight: 0.78, type: 'match' as const },
      { source: 'source-2', target: 'source-3', weight: 0.85, type: 'match' as const },
      { source: 'source-4', target: 'golden-2', weight: 0.96, type: 'merge' as const },
      { source: 'source-5', target: 'golden-2', weight: 0.89, type: 'merge' as const },
      { source: 'source-4', target: 'source-5', weight: 0.82, type: 'match' as const },
    ] as ClusterEdge[],
  }

  useEffect(() => {
    if (!cytoscapeRef.current) return

    const elements = [
      ...mockData.nodes.map(node => ({
        data: {
          id: node.id,
          label: showLabels ? node.name : node.id,
          name: node.name,
          type: node.type,
          clusterId: node.clusterId,
        },
        classes: node.type,
      })),
      ...mockData.edges.map(edge => ({
        data: {
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
          type: edge.type,
        },
        classes: edge.type,
      })),
    ]

    cyRef.current = cytoscape({
      container: cytoscapeRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => ele.data('type') === 'golden' ? '#10b981' : '#3b82f6',
            'border-color': '#ffffff',
            'border-width': 2,
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'color': '#ffffff',
            'text-outline-color': (ele) => ele.data('type') === 'golden' ? '#059669' : '#2563eb',
            'text-outline-width': 1,
            'width': (ele) => ele.data('type') === 'golden' ? '50px' : '30px',
            'height': (ele) => ele.data('type') === 'golden' ? '50px' : '30px',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': (ele) => Math.max(1, ele.data('weight') * 5),
            'line-color': (ele) => ele.data('type') === 'merge' ? '#ef4444' : '#6b7280',
            'target-arrow-color': (ele) => ele.data('type') === 'merge' ? '#ef4444' : '#6b7280',
            'target-arrow-shape': (ele) => ele.data('type') === 'merge' ? 'triangle' : 'none',
            'curve-style': 'bezier',
          },
        },
        {
          selector: ':selected',
          style: {
            'border-color': '#f59e0b',
            'border-width': 4,
          },
        },
      ],
      layout: {
        name: layout,
        animate: true,
        animationDuration: 1000,
        nodeDimensionsIncludeLabels: true,
      },
    })

    // Event handlers
    cyRef.current.on('tap', 'node', (event) => {
      const node = event.target
      const nodeData = mockData.nodes.find(n => n.id === node.id())
      setSelectedNode(nodeData || null)
    })

    cyRef.current.on('tap', (event) => {
      if (event.target === cyRef.current) {
        setSelectedNode(null)
      }
    })

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
      }
    }
  }, [layout, showLabels])

  const handleLayoutChange = (newLayout: string) => {
    setLayout(newLayout)
    if (cyRef.current) {
      const layoutInstance = cyRef.current.layout({ name: newLayout, animate: true })
      layoutInstance.run()
    }
  }

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit()
    }
  }

  return (
    <div className="h-screen flex">
      {/* Graph Visualization */}
      <div className="flex-1 relative">
        {/* Controls */}
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Layout</span>
          </div>

          <div className="space-y-2">
            <select
              value={layout}
              onChange={(e) => handleLayoutChange(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="cose-bilkent">CoSE-Bilkent</option>
              <option value="circle">Circle</option>
              <option value="grid">Grid</option>
              <option value="random">Random</option>
            </select>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`p-1 rounded ${showLabels ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              >
                {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <span className="text-xs text-gray-600">Labels</span>
            </div>

            <button
              onClick={handleFit}
              className="w-full px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Fit to View
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Legend</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Golden Records</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Source Records</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span className="text-sm text-gray-600">Merge Relationships</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-gray-500"></div>
              <span className="text-sm text-gray-600">Match Relationships</span>
            </div>
          </div>
        </div>

        {/* Cytoscape Container */}
        <div
          ref={cytoscapeRef}
          className="cytoscape-container w-full h-full"
        />
      </div>

      {/* Side Panel */}
      <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {selectedNode ? 'Node Details' : 'Cluster Overview'}
          </h2>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="text-sm text-gray-900">{selectedNode.name}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Type</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedNode.type === 'golden'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedNode.type === 'golden' ? 'Golden Record' : 'Source Record'}
                </span>
              </div>

              {selectedNode.clusterId && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Cluster</h3>
                  <p className="text-sm text-gray-900">{selectedNode.clusterId}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Actions</h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    View Full Details
                  </button>
                  {selectedNode.type === 'source' && (
                    <button className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                      Accept Merge
                    </button>
                  )}
                  <button className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                    Split from Cluster
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Network className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a node</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Click on any node in the graph to view its details and available actions.
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Golden Records:</span>
                    <span className="ml-2 font-medium">
                      {mockData.nodes.filter(n => n.type === 'golden').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Source Records:</span>
                    <span className="ml-2 font-medium">
                      {mockData.nodes.filter(n => n.type === 'source').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Clusters:</span>
                    <span className="ml-2 font-medium">
                      {new Set(mockData.nodes.map(n => n.clusterId).filter(Boolean)).size}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Relationships:</span>
                    <span className="ml-2 font-medium">{mockData.edges.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
