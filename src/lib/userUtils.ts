export function getAvatarInfo(user: any, profile: any) {
  let avatarUrl = profile?.avatar_url
  
  // If no avatar in profile, check if user has a google avatar in meta data
  if (!avatarUrl && user?.raw_user_meta_data?.avatar_url) {
    avatarUrl = user.raw_user_meta_data.avatar_url
  }

  // If still no avatar, generate initials
  let initials = ''
  if (!avatarUrl && user) {
    const displayString = profile?.username !== user.email ? profile?.username : user.email
    if (displayString) {
      initials = displayString.substring(0, 2).toUpperCase()
    }
  }

  return { avatarUrl, initials }
}
