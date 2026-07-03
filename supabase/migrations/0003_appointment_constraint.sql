-- Migration: Prevent double booking of appointments for a specific doctor and time slot
CREATE UNIQUE INDEX unique_doctor_slot ON appointments (doctor_id, start_time) WHERE status = 'scheduled';
