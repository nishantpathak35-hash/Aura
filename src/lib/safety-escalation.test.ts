import { describe, it, expect } from 'vitest';
import { checkSafetyEscalation } from './safety-escalation';

describe('Safety Escalation Engine', () => {
  it('should trigger on English emergency phrases', () => {
    expect(checkSafetyEscalation("I am having severe chest pain right now")).toBe(true);
    expect(checkSafetyEscalation("Please help, it's an emergency")).toBe(true);
    expect(checkSafetyEscalation("I can't breathe")).toBe(true);
  });

  it('should trigger on suicide and self-harm', () => {
    expect(checkSafetyEscalation("I want to kill myself")).toBe(true);
    expect(checkSafetyEscalation("I'm thinking about suicide")).toBe(true);
  });

  it('should trigger on Hindi/Hinglish emergencies', () => {
    expect(checkSafetyEscalation("Mujhe chhati mein dard ho raha hai")).toBe(true);
    expect(checkSafetyEscalation("Wo behosh ho gaya")).toBe(true);
    expect(checkSafetyEscalation("Khoon beh raha hai")).toBe(true);
  });

  it('should trigger on second-hand emergency reports', () => {
    expect(checkSafetyEscalation("My father is having chest pain")).toBe(true);
    expect(checkSafetyEscalation("My wife fainted in the bathroom")).toBe(true);
  });

  it('should not trigger on normal medical inquiries', () => {
    expect(checkSafetyEscalation("I have a headache")).toBe(false);
    expect(checkSafetyEscalation("I need to book an appointment for tomorrow")).toBe(false);
    expect(checkSafetyEscalation("What are your clinic hours?")).toBe(false);
  });
});
