export type Note = {
	id: string;
	folderId: string | null;
	body: string;
	createdAt: number;
	updatedAt: number;
	/** Soft delete — non-null means the note lives in Trash. */
	deletedAt: number | null;
};

export type Folder = {
	id: string;
	name: string;
	createdAt: number;
};

/** Which pane of the list is being shown. `null` = All Notes. */
export type Selection = { folderId: string | null | 'trash'; noteId: string | null };

/** Derived note title: first non-empty line, macOS Notes style. */
export function noteTitle(note: Note): string {
	const line = note.body.split('\n').find((l) => l.trim().length > 0);
	return line?.trim().slice(0, 120) || 'New Note';
}

/** Derived one-line preview: everything after the title line. */
export function notePreview(note: Note): string {
	const lines = note.body.split('\n');
	const titleIndex = lines.findIndex((l) => l.trim().length > 0);
	if (titleIndex === -1) return 'No additional text';
	const rest = lines
		.slice(titleIndex + 1)
		.join(' ')
		.trim();
	return rest.length > 0 ? rest.slice(0, 160) : 'No additional text';
}
