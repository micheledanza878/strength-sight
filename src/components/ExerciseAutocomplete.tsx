/**
 * ExerciseAutocomplete
 *
 * Input con autocomplete che interroga la tabella `exercises` su Supabase
 * tramite `ilike` (fuzzy search case-insensitive) con debounce a 300ms.
 *
 * Comportamento:
 * - L'utente digita: dopo 300ms si esegue la query su Supabase
 * - Il dropdown mostra al massimo 8 risultati ordinati per nome
 * - Se il testo digitato non corrisponde ad alcun risultato, l'utente
 *   può comunque confermare il nome custom premendo Invio o uscendo dal campo
 * - Selezionando un suggerimento il valore viene propagato tramite onChange
 *
 * Props:
 * - value: string          → il valore corrente del campo (controllato)
 * - onChange: (v) => void  → callback chiamata sia alla selezione di un
 *                            suggerimento, sia alla digitazione libera
 * - placeholder: string    → testo placeholder opzionale
 * - className: string      → classi extra sull'input wrapper
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader, Search } from "lucide-react";

interface ExerciseSuggestion {
  id: string;
  name: string;
  category?: string | null;
}

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 300;

export function ExerciseAutocomplete({
  value,
  onChange,
  placeholder = "Nome esercizio",
  className,
}: ExerciseAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Indice del suggerimento evidenziato per la navigazione da tastiera
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Chiude il dropdown se si clicca fuori dal componente
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      // ilike esegue una ricerca case-insensitive con wildcard su Supabase.
      // Il pattern "%term%" trova qualsiasi nome che contenga la stringa,
      // simulando una fuzzy search di base senza dipendenze esterne.
      const { data, error } = await (supabase as any)
        .from("exercises")
        .select("id, name, category")
        .ilike("name", `%${query.trim()}%`)
        .order("name", { ascending: true })
        .limit(MAX_RESULTS);

      if (error) {
        // Se la tabella non esiste o RLS blocca, gestiamo silenziosamente
        console.error("ExerciseAutocomplete: errore fetch suggerimenti", error);
        setSuggestions([]);
        return;
      }

      setSuggestions(data ?? []);
      setOpen((data?.length ?? 0) > 0);
      setHighlightedIdx(-1);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    onChange(newValue);

    // Annulla il timer precedente prima di impostarne uno nuovo (debounce)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, DEBOUNCE_MS);
  }

  function handleSelectSuggestion(suggestion: ExerciseSuggestion) {
    onChange(suggestion.name);
    setSuggestions([]);
    setOpen(false);
    setHighlightedIdx(-1);
    // Rimuoviamo il focus dall'input dopo la selezione per chiudere
    // eventuali tastiere mobili che si sovrappongono al dropdown
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIdx(-1);
    }
  }

  function handleFocus() {
    // Riapre il dropdown se ci sono già suggerimenti (utente che ritorna sul campo)
    if (suggestions.length > 0) setOpen(true);
  }

  // Pulizia del timer al unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const inputBase =
    "w-full h-10 bg-secondary border border-border rounded-xl px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary transition-all pr-8";

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {/* Input principale */}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="exercise-autocomplete-list"
        className={inputBase}
      />

      {/* Indicatore di caricamento o icona ricerca */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        {loading ? (
          <Loader className="w-3.5 h-3.5 animate-spin" />
        ) : (
          value.length > 0 && <Search className="w-3.5 h-3.5 opacity-40" />
        )}
      </div>

      {/* Dropdown suggerimenti */}
      {open && suggestions.length > 0 && (
        <ul
          id="exercise-autocomplete-list"
          role="listbox"
          aria-label="Suggerimenti esercizi"
          className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map((suggestion, idx) => (
            <li
              key={suggestion.id}
              role="option"
              aria-selected={idx === highlightedIdx}
              // onMouseDown invece di onClick per evitare che il blur
              // sull'input chiuda il dropdown prima del click
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(suggestion);
              }}
              onMouseEnter={() => setHighlightedIdx(idx)}
              className={[
                "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors text-sm",
                idx === highlightedIdx
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-secondary",
                idx < suggestions.length - 1 ? "border-b border-border/50" : "",
              ].join(" ")}
            >
              <span className="font-medium truncate">{suggestion.name}</span>
              {suggestion.category && (
                <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0 bg-secondary px-1.5 py-0.5 rounded-md">
                  {suggestion.category}
                </span>
              )}
            </li>
          ))}

          {/* Suggerimento per usare il valore custom digitato */}
          {value.trim() &&
            !suggestions.some(
              (s) => s.name.toLowerCase() === value.trim().toLowerCase()
            ) && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                }}
                className="px-3 py-2.5 text-xs text-muted-foreground border-t border-border/50 italic cursor-default"
              >
                Usa "{value.trim()}" come esercizio personalizzato
              </li>
            )}
        </ul>
      )}
    </div>
  );
}
