export const getRate = (consultant) => {
  const event = consultant.consultantEvents[0];
  if (!event) return 2000.00;

  return event.annualSalary / 200;
}
