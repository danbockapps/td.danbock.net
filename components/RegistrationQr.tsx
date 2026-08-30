'use client'

import {QRCodeSVG} from 'qrcode.react'

export function RegistrationQr({url}: {url: string}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-box bg-white p-4">
        <QRCodeSVG value={url} size={256} />
      </div>
      <p className="text-sm break-all text-base-content/60">{url}</p>
    </div>
  )
}
