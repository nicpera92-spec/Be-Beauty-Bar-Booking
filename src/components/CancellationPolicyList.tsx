import { resolveCancellationPolicy } from "@/lib/cancellationPolicy";

export default function CancellationPolicyList({
  policy,
  refundHours,
  className,
}: {
  policy: string | null | undefined;
  refundHours: number;
  className?: string;
}) {
  const points = resolveCancellationPolicy(policy, refundHours);
  return (
    <ul className={className}>
      {points.map((segments, i) => (
        <li key={i}>
          {segments.map((segment, j) =>
            segment.bold ? <strong key={j}>{segment.text}</strong> : <span key={j}>{segment.text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
