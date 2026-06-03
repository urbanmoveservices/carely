/** Default medication reminder: 1 hour from now */
export function defaultMedicationReminderAt(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

/** Appointment reminder: 1 day before, or 30 min from now if already past */
export function appointmentReminderAt(appointmentAt: Date): Date {
  const reminder = new Date(appointmentAt);
  reminder.setDate(reminder.getDate() - 1);
  if (reminder.getTime() <= Date.now()) {
    return new Date(Date.now() + 30 * 60 * 1000);
  }
  return reminder;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
