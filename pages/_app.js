import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js" strategy="beforeInteractive" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
