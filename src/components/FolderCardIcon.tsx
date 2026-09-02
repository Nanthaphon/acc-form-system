interface Props {
  count: number
}

export default function FolderCardIcon({ count }: Props) {
  return (
    <div aria-label={`${count} ฟอร์ม`} className="relative mx-auto h-[86px] w-[120px]">
      <img
        src="/icons/open-folder.png"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(180,121,0,0.16)]"
      />
      <div className="absolute bottom-1 right-1 rounded-full border border-white/80 bg-white/90 px-2 py-0.5 text-xs font-semibold text-[#8a5a00] shadow-sm">
        {count}
      </div>
    </div>
  )
}
