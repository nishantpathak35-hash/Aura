export const SAFETY_KEYWORDS = [
  // English Emergency
  'emergency', 'chest pain', 'bleeding', 'suicide', 'kill myself', 'difficulty breathing', 
  'loss of consciousness', 'unconscious', 'fainted', 'heart attack', 'stroke',
  'severe pain', 'hemorrhage', 'can\'t breathe', 'stopped breathing',

  // Hindi/Hinglish Emergency
  'dil ka daura', 'saans lene mein takleef', 'behosh', 'khoon nikal raha', 
  'khoon beh raha', 'chhati mein dard', 'marne ka mann', 'khudkushi',

  // Second-hand Emergency
  'father is having chest pain', 'mother fainted', 'my son can\'t breathe', 
  'husband is unconscious', 'wife is bleeding heavily'
];

export function checkSafetyEscalation(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Direct keyword check
  for (const keyword of SAFETY_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return true;
    }
  }

  // Regex for more complex patterns (e.g. bleeding + uncontrollably/heavily)
  if (lowerMessage.match(/bleeding (heavily|uncontrollably|a lot|non-stop)/)) return true;

  return false;
}
