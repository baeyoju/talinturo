import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Icon } from "@/components/ui/Icon";

export function VocabularyPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All signs");
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    api("/vocabulary")
      .then((result) => setWords(result.words))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);
  const toggleSaved = async (item) => {
    setSaveError("");
    try {
      const { is_saved } = await api(`/vocabulary/${item.id}/favorite`, { method: item.is_saved ? "DELETE" : "PUT" });
      setWords((current) => current.map((word) => word.id === item.id ? { ...word, is_saved } : word));
    } catch (error) {
      setSaveError(error.message);
    }
  };
  const categories = ["All signs", ...new Set(words.map((item) => item.category))];
  const filtered = words.filter((item) => (category === "All signs" || item.category === category) && `${item.word} ${item.meaning}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageTitle eyebrow="A LITTLE WORD, A BIG CONNECTION" title="FSL vocabulary" description="Discover useful Filipino Sign Language signs and add your favorites to practice later." />
    {(loadError || saveError) && <p className="inline-error">{loadError || saveError}</p>}
    <div className="vocab-controls"><label className="search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search signs..." /><kbd>⌘ K</kbd></label><div className="filter-row">{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "filter-active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    {loading ? <div className="empty-state">Loading vocabulary…</div> : filtered.length ? <div className="vocab-grid">{filtered.map((item) => <article className="vocab-card" key={item.id}><button className={`save-sign ${item.is_saved ? "saved" : ""}`} aria-label={`${item.is_saved ? "Unsave" : "Save"} ${item.word}`} onClick={() => toggleSaved(item)}>{item.is_saved ? "♥" : "♡"}</button>{item.media_url ? <img className="vocab-emoji" src={item.media_url} alt={item.word} /> : <div className="vocab-emoji"><Icon name="hand" size={38} /></div>}<span className="category-tag">{item.category}</span><h2>{item.word}</h2><p>{item.meaning}</p>{item.hint && <small>{item.hint}</small>}<button className="vocab-practice" onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(item.word))}><Icon name="volume" size={16} /> Hear the word</button></article>)}</div> : <div className="empty-state"><Icon name="search" size={34} /><h2>{words.length ? "No signs found" : "No published vocabulary yet"}</h2><p>{words.length ? "Try a different search or category." : <>Add published signs to PostgreSQL <code>vocabulary_signs</code> with a word, meaning, and category.</>}</p></div>}
  </>;
}
