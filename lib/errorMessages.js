/**
 * Utility functions to convert technical error messages to user-friendly plain English
 */

/**
 * Converts technical error messages to user-friendly plain English
 * @param {Error|string} error - The error object or error message string
 * @param {string} defaultMessage - Default message if error can't be categorized
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyError(error, defaultMessage = "Something went wrong. Please try again.") {
  // Handle both Error objects and string messages
  const errorMessage = typeof error === "string" ? error : error?.message || "";
  const errorCode = error?.code?.toString() || "";
  const errorMsg = errorMessage.toLowerCase();

  // Email-related errors
  if (
    errorMsg.includes("user_profiles_email_unique") ||
    errorMsg.includes("duplicate key value") ||
    errorMsg.includes("already registered") ||
    errorMsg.includes("email") && (errorMsg.includes("already") || errorMsg.includes("exists") || errorMsg.includes("duplicate")) ||
    errorCode === "23505"
  ) {
    return "This email is already registered. Please sign in instead.";
  }

  if (errorMsg.includes("invalid email") || errorMsg.includes("email format")) {
    return "Please enter a valid email address.";
  }

  // Password-related errors
  if (errorMsg.includes("password") && (errorMsg.includes("weak") || errorMsg.includes("too simple"))) {
    return "Password is too weak. Please choose a stronger password.";
  }

  if (errorMsg.includes("password") && (errorMsg.includes("short") || errorMsg.includes("minimum"))) {
    return "Password is too short. Please use at least 6 characters.";
  }

  if (errorMsg.includes("password") && errorMsg.includes("mismatch")) {
    return "Passwords don't match. Please make sure both passwords are the same.";
  }

  // Network/connection errors
  if (errorMsg.includes("network") || errorMsg.includes("fetch") || errorMsg.includes("networkerror")) {
    return "Network error. Please check your internet connection and try again.";
  }

  if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
    return "Request timed out. Please try again.";
  }

  if (errorMsg.includes("failed to fetch") || errorMsg.includes("network request failed")) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  // Authentication errors
  if (errorMsg.includes("auth") || errorMsg.includes("authentication") || errorMsg.includes("unauthorized")) {
    return "Authentication error. Please sign in again.";
  }

  if (errorMsg.includes("invalid credentials") || errorMsg.includes("wrong password")) {
    return "Invalid email or password. Please try again.";
  }

  if (errorMsg.includes("email not confirmed") || errorMsg.includes("email not verified")) {
    return "Please check your email and click the confirmation link before signing in.";
  }

  // File/upload errors
  if (errorMsg.includes("file") && errorMsg.includes("too large")) {
    return "File is too large. Please choose a smaller file.";
  }

  if (errorMsg.includes("file") && errorMsg.includes("format") || errorMsg.includes("file type")) {
    return "File format not supported. Please choose a different file.";
  }

  if (errorMsg.includes("upload") && errorMsg.includes("failed")) {
    return "Upload failed. Please try again.";
  }

  // Database/constraint errors
  if (errorMsg.includes("constraint") || errorMsg.includes("violates")) {
    // Try to extract meaningful info from constraint errors
    if (errorMsg.includes("unique") || errorMsg.includes("duplicate")) {
      if (errorMsg.includes("email")) {
        return "This email is already registered. Please sign in instead.";
      }
      if (errorMsg.includes("username")) {
        return "This username is already taken. Please choose another one.";
      }
      return "This information is already in use. Please try something different.";
    }
    return "Invalid information provided. Please check your input and try again.";
  }

  // Permission errors
  if (errorMsg.includes("permission") || errorMsg.includes("not authorized") || errorMsg.includes("forbidden")) {
    return "You don't have permission to perform this action.";
  }

  // Not found errors
  if (errorMsg.includes("not found") || errorMsg.includes("does not exist")) {
    return "The requested item could not be found.";
  }

  // Rate limiting
  if (errorMsg.includes("rate limit") || errorMsg.includes("too many requests")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Generic error patterns that should be hidden
  if (
    errorMsg.includes("pgrst") ||
    errorMsg.includes("postgres") ||
    errorMsg.includes("sql") ||
    errorMsg.includes("database") ||
    errorMsg.includes("internal server error") ||
    errorMsg.includes("500") ||
    errorMsg.includes("error code")
  ) {
    return defaultMessage;
  }

  // If we can't categorize it, return the default message
  // Don't expose technical error messages to users
  return defaultMessage;
}

/**
 * Gets a user-friendly error message for signup errors
 */
export function getSignupErrorMessage(error) {
  return getUserFriendlyError(error, "Failed to create account. Please try again.");
}

/**
 * Gets a user-friendly error message for login errors
 */
export function getLoginErrorMessage(error) {
  return getUserFriendlyError(error, "Failed to sign in. Please try again.");
}

/**
 * Gets a user-friendly error message for general errors
 */
export function getGeneralErrorMessage(error) {
  return getUserFriendlyError(error, "Something went wrong. Please try again.");
}

/**
 * Gets a user-friendly error message for audio playback errors
 */
export function getAudioErrorMessage(error) {
  const errorMessage = typeof error === "string" ? error : error?.message || "";
  const errorMsg = errorMessage.toLowerCase();

  // AVAsset/audio file format errors (e.g. [AVAsset isPlayable:] returned false)
  if (
    errorMsg.includes("avasset") ||
    errorMsg.includes("isplayable") ||
    errorMsg.includes("does not contain a playable") ||
    errorMsg.includes("does not contain a playable content") ||
    errorMsg.includes("not supported by the device") ||
    errorMsg.includes("unsupported format") ||
    errorMsg.includes("invalid audio") ||
    errorMsg.includes("corrupted") ||
    errorMsg.includes("load encountered an error")
  ) {
    return "This audio file can't be played on this device. It may be in an unsupported format or the file may be damaged. Try another mix.";
  }

  // Audio loading errors
  if (
    errorMsg.includes("failed to load") ||
    errorMsg.includes("could not load") ||
    errorMsg.includes("unable to load")
  ) {
    return "Unable to load this audio file. Please check your connection and try again.";
  }

  // Network-related audio errors
  if (
    errorMsg.includes("network") ||
    errorMsg.includes("timeout") ||
    errorMsg.includes("connection")
  ) {
    return "Network error while loading audio. Please check your internet connection and try again.";
  }

  // File not found errors
  if (
    errorMsg.includes("not found") ||
    errorMsg.includes("does not exist") ||
    errorMsg.includes("404")
  ) {
    return "This audio file could not be found. It may have been removed.";
  }

  // Generic audio error fallback
  return getUserFriendlyError(error, "Unable to play this audio. Please try a different mix.");
}

