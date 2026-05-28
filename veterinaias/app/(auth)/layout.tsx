import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="petMedical.app" width={220} height={88} priority />
        </div>
        {children}
      </div>
    </div>
  )
}
