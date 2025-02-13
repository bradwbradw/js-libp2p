import { createLibp2p } from '../../dist/src/index.js'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'
import { pipe } from 'it-pipe'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    streamMuxers: [yamux(), mplex()],
    connectionEncryption: [noise()]
  })

  return node
}

;(async () => {
  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  await node1.peerStore.patch(node2.peerId, {
    multiaddrs: node2.getMultiaddrs()
  })

  node2.handle('/a-protocol', ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(uint8ArrayToString(msg.subarray()))
        }
      }
    )
  })

  const stream = await node1.dialProtocol(node2.peerId, '/a-protocol')

  await pipe(
    [uint8ArrayFromString('This information is sent out encrypted to the other peer')],
    stream
  )
})()
