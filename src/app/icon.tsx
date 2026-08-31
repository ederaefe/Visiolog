import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 512,
  height: 512,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#145200',
          borderRadius: '110px',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width="360"
          height="360"
        >
          <g transform="translate(0,512) scale(1,-1)" fill="#ffffff">
            <path d="M303 402 c0 0 26 -28 44 -46 l11 -12 5 0 4 0 -2 -2 c-1 -1 -3 -5 -4 -7 -3 -5 -10 -15 -19 -29 -3 -4 -6 -8 -8 -11 l-3 -4 -3 2 c-1 1 -14 16 -29 32 -38 40 -45 47 -49 49 -3 1 -6 2 -9 2 l-4 0 -4 -3 c-3 -1 -9 -7 -13 -13 -10 -11 -18 -19 -34 -38 -6 -7 -18 -20 -25 -28 -8 -9 -17 -20 -21 -24 -4 -4 -15 -17 -24 -28 -10 -11 -20 -22 -23 -26 -3 -3 -12 -14 -21 -24 -8 -10 -17 -21 -20 -23 -2 -3 -6 -8 -7 -12 l-3 -6 0 -4 c1 -6 4 -11 9 -16 7 -7 16 -11 35 -16 23 -7 68 -7 95 0 20 5 34 10 51 18 19 9 40 21 62 37 l3 2 -2 2 c-4 6 -37 41 -38 41 0 1 -4 -1 -7 -4 -8 -6 -26 -16 -37 -22 -11 -5 -32 -14 -39 -15 -3 0 -10 -2 -15 -3 -11 -2 -30 -4 -30 -2 0 1 27 32 35 41 3 2 13 14 24 26 10 12 25 29 33 38 8 8 16 17 18 19 l4 4 10 -11 c6 -6 24 -25 40 -42 49 -51 84 -87 90 -91 2 -1 9 -5 15 -7 l10 -3 31 -1 31 0 0 1 c0 0 -3 4 -7 8 -4 3 -16 16 -27 28 -10 12 -28 31 -39 43 -11 11 -21 22 -23 24 l-2 3 2 3 c4 4 12 16 30 42 6 9 11 17 11 18 0 0 1 2 3 4 4 6 19 31 19 32 0 0 1 2 3 4 1 2 6 11 12 20 5 8 9 16 10 17 2 2 7 12 7 13 l0 1 -83 0 c-45 0 -82 -1 -83 -1z" />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
