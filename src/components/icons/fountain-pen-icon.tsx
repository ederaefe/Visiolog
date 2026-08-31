import React from 'react'

export function FountainPenIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M60.2 136c-18-24.8-11.7-59.5 13.1-77.5 24.8-18 59.5-11.7 77.5 13.1L231 181.8c12 16.5 7.8 39.7-9.3 51l-40.3 26.6c-16.1 10.6-38.1 4.9-47.5-12.7L60.2 136z" />
      <path d="M190.8 259.4c-9.1-12.6-6.1-30.2 6.6-39.3l37.2-26.6c12.6-9 30.2-6.1 39.3 6.6 9 12.6 6.1 30.2-6.6 39.3l-37.2 26.6c-12.6 9-30.2 6.1-39.3-6.6z" opacity="0.9" />
      <path d="M239.5 273.7l34.8-24.9c5.1-3.6 12.1-2.5 15.8 2.6l9.6 13.3c3.6 5.1 2.5 12.1-2.6 15.8l-34.8 24.9-22.8-31.7z" />
      <path d="M262.3 305.2l22.7 31.5c2.4 3.3 5.4 6 8.9 8l48.8 28.2 26.3 75.9c1.9 5.5-1.9 11.2-7.5 11.2h-3.3c-2.4 0-4.8-.9-6.6-2.6L292.8 394c-2.9-2.9-6.9-4.5-11-4.5h-5.2c-5.5 0-10.4-3.5-12.2-8.7l-15.3-44.1 13.2-31.5z" />
      <circle cx="316" cy="370" r="10" fill="none" stroke="currentColor" stroke-width="4" />
      <line x1="322" y1="377" x2="352" y2="455" stroke="currentColor" stroke-width="5" stroke-linecap="round" />
      <path
        d="M352 455c15 3 45 4 80-15 35-19 55-40 60-70s-10-60-25-85-30-50-20-80c10-30 45-70 50-100 5-30-10-50-20-60"
        fill="none"
        stroke="currentColor"
        stroke-width="26"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}
