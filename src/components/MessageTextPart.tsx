interface MessageTextPartProps {
  part: { type: 'text'; text: string };
}

export function MessageTextPart({ part }: MessageTextPartProps) {
  return <div className="whitespace-pre-wrap break-words">{part.text}</div>;
}
