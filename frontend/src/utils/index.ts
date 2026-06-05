import dayjs from "dayjs";
import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

export function calcAge(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const b = dayjs(birthday);
  const now = dayjs();
  let age = now.year() - b.year();
  if (now.month() < b.month() || (now.month() === b.month() && now.date() < b.date())) {
    age--;
  }
  return age;
}
