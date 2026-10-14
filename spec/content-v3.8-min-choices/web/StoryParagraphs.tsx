import React from 'react';
import './story-paragraphs.css';

/** Display exactly one narrative source. Do not also render presentation.dialogues. */
export function StoryParagraphs({ text }: { text: string }) {
  const paragraphs = (text ?? '').replace(/\r\n?/g, '\n').trim()
    .split(/\n[ \t]*\n+/).map(p => p.trim()).filter(Boolean);
  return <div className="story-prose">{paragraphs.map((p, i) => (
    <p className="story-paragraph" key={i}>{p}</p>
  ))}</div>;
}
