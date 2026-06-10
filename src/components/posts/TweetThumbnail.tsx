"use client"

import { useEffect, useState } from "react"
import { Image as ImageIcon } from "lucide-react"

export default function TweetThumbnail({ url }: { url: string }) {
  const [tweet, setTweet] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!url) {
      setLoading(false)
      return
    }

    // X (Twitter) URL から ID を抽出
    const match = url.match(/status\/(\d+)/)
    if (!match) {
      setLoading(false)
      return
    }
    
    const tweetId = match[1]
    
    fetch(`/api/tweet?id=${tweetId}`)
      .then(res => res.json())
      .then(data => {
        if (data.tweet) {
          setTweet(data.tweet)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [url])

  if (loading) {
    return <div className="h-16 w-16 bg-muted animate-pulse rounded-md border shrink-0"></div>
  }

  if (tweet?.photos && tweet.photos.length > 0) {
    return (
      <div className="shrink-0">
        <img 
          src={tweet.photos[0].url} 
          alt="Thumbnail" 
          className="h-16 w-16 object-cover rounded-md border shadow-sm"
        />
      </div>
    )
  }
  
  if (tweet?.video) {
    return (
      <div className="shrink-0 bg-black h-16 w-16 rounded-md flex items-center justify-center border shadow-sm">
        <ImageIcon className="w-6 h-6 text-white" />
      </div>
    )
  }

  return null
}
