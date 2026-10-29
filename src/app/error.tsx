"use client";
import { ErrorOperacion } from '@/components/cliente/ErrorOperacion';
export default function ErrorPagina({ reset }: { reset: () => void }) {
  return <ErrorOperacion reset={reset} />;
}
