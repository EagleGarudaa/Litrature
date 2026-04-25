interface AudioStateBadgeProps {
  isSelfMuted: boolean;
  isForceMuted: boolean;
  isRoomSilenced: boolean;
  className?: string;
}

export function AudioStateBadge({
  isSelfMuted,
  isForceMuted,
  isRoomSilenced,
  className = '',
}: AudioStateBadgeProps) {
  const isMuted = isSelfMuted || isForceMuted;
  const isBothMutedAndSilenced = isMuted && isRoomSilenced;

  if (!isMuted && !isRoomSilenced) {
    return null;
  }

  let iconSrc = '';
  let title = '';

  if (isBothMutedAndSilenced) {
    iconSrc = '/deafNdumb.png';
    title = isForceMuted
      ? 'You are muted by host and have silenced the room'
      : 'You are self-muted and have silenced the room';
  } else if (isRoomSilenced) {
    iconSrc = '/deaf.png';
    title = 'You have silenced incoming audio';
  } else if (isForceMuted) {
    iconSrc = '/force-mute.jpg';
    title = 'You have been muted by the host';
  } else if (isSelfMuted) {
    iconSrc = '/self-mute.jpg';
    title = 'You have muted your microphone';
  }

  return (
    <img
      src={iconSrc}
      alt={title}
      title={title}
      className={`w-5 h-5 animate-pulse ${className}`}
    />
  );
}
