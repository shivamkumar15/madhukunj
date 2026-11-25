interface MadhukunjMarkProps {
  className?: string;
  inverted?: boolean;
}

export function MadhukunjMark({ className = '' }: MadhukunjMarkProps) {
  return <img src="/madhukunj/images/madhukunj-logo.png" alt="" className={className} />;
}
