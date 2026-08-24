import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DictionarySearchFormProps {
  defaultValue?: string;
  autoFocus?: boolean;
}

/**
 * Plain GET form to /dictionary/search — works with JS disabled, and the
 * resulting URL (?q=...) is shareable/bookmarkable.
 */
export function DictionarySearchForm({
  defaultValue,
  autoFocus,
}: DictionarySearchFormProps) {
  return (
    <form action="/dictionary/search" method="GET" role="search" className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={'Search the dictionary — e.g. "mercy" or بسم'}
        aria-label="Search the dictionary"
        autoFocus={autoFocus}
        className="pl-9 h-11 text-base"
      />
    </form>
  );
}
