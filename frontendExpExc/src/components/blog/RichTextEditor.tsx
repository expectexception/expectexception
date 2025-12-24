import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Box, ToggleButton, ToggleButtonGroup, IconButton, Divider, Tooltip,
    Select, MenuItem, FormControl, InputLabel, Menu
} from '@mui/material';
import {
    FormatBold, FormatItalic, FormatUnderlined, FormatListBulleted, FormatListNumbered,
    Image as ImageIcon, Title, FormatQuote, Code, Highlight as HighlightIcon,
    FormatAlignLeft, FormatAlignCenter, FormatAlignRight, FormatAlignJustify,
    Link as LinkIcon, TableChart, CheckBox, FormatColorText, FontDownload,
    AddPhotoAlternate, Undo, Redo, Fullscreen, FullscreenExit
} from '@mui/icons-material';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
}


// MenuBar Props Interface
interface MenuBarProps {
    editor: any;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
    uploadImage: (file?: File) => Promise<void>;
}

const MenuBar: React.FC<MenuBarProps> = ({ 
    editor, 
    isFullscreen, 
    toggleFullscreen,
    uploadImage 
}) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const openTableMenu = Boolean(anchorEl);

    const handleTableClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleTableClose = () => {
        setAnchorEl(null);
    };

    if (!editor) return null;

    const addLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const addColor = () => {
        const color = window.prompt('Enter color hex (e.g. #ff0000)', '#000000');
        if (color) {
            editor.chain().focus().setColor(color).run();
        }
    };


    return (
        <Box sx={{
            borderBottom: 1, borderColor: 'divider', p: { xs: 0.5, sm: 1.5 }, mb: 0,
            display: 'flex', gap: 0.5, flexWrap: 'wrap',
            bgcolor: '#f8fafc', alignItems: 'center',
            position: 'sticky', top: 0, zIndex: 1100,
            color: '#1e293b',
            '& .MuiIconButton-root': { color: '#475569', p: { xs: 0.5, sm: 1 } },
            '& .MuiToggleButton-root': { color: '#475569', p: { xs: 0.5, sm: 1 } },
            '& .MuiSelect-select': { color: '#1e293b' },
            '& .MuiInputLabel-root': { color: '#64748b' },
        }}>
            {/* Fullscreen Toggle */}
            <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}>
                <IconButton size="small" onClick={toggleFullscreen} color="primary">
                    {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.5 } }} />

            {/* History */}
            <ToggleButtonGroup size="small">
                <Tooltip title="Undo">
                    <IconButton size="small" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                        <Undo fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Redo">
                    <IconButton size="small" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                        <Redo fontSize="small" />
                    </IconButton>
                </Tooltip>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.5 } }} />

            {/* Fonts */}
            <FormControl size="small" sx={{ minWidth: { xs: 80, sm: 120 } }}>
                <InputLabel id="font-family-select-label" sx={{ fontSize: '0.7rem', top: '-5px' }}>Font</InputLabel>
                <Select
                    labelId="font-family-select-label"
                    value={editor.getAttributes('textStyle').fontFamily || ''}
                    label="Font"
                    onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                    sx={{ height: 28, fontSize: '0.7rem' }}
                >
                    <MenuItem value="Inter" sx={{ fontSize: '0.8rem' }}>Inter</MenuItem>
                    <MenuItem value="Comic Sans MS, Comic Sans" sx={{ fontSize: '0.8rem' }}>Comic</MenuItem>
                    <MenuItem value="serif" sx={{ fontSize: '0.8rem' }}>Serif</MenuItem>
                    <MenuItem value="monospace" sx={{ fontSize: '0.8rem' }}>Mono</MenuItem>
                </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.5 } }} />

            {/* Formatting */}
            <ToggleButtonGroup size="small">
                <Tooltip title="Bold">
                    <ToggleButton value="bold" selected={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                        <FormatBold fontSize="small" />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Italic">
                    <ToggleButton value="italic" selected={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                        <FormatItalic fontSize="small" />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Underline">
                    <ToggleButton value="underline" selected={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                        <FormatUnderlined fontSize="small" />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Text Color">
                    <IconButton size="small" onClick={addColor}>
                        <FormatColorText fontSize="small" style={{ color: editor.getAttributes('textStyle').color || 'inherit' }} />
                    </IconButton>
                </Tooltip>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.5 } }} />

            {/* Headings */}
            <ToggleButtonGroup size="small">
                <Tooltip title="Paragraph">
                    <ToggleButton value="p" selected={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
                        <span style={{ fontWeight: 'bold' }}>P</span>
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Heading 1">
                    <ToggleButton value="h1" selected={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                        <Title fontSize="small" />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Heading 2">
                    <ToggleButton value="h2" selected={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                        <Title fontSize="small" sx={{ transform: 'scale(0.8)' }} />
                    </ToggleButton>
                </Tooltip>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.5 } }} />

            {/* Lists */}
            <ToggleButtonGroup size="small">
                <Tooltip title="Bullet List">
                    <ToggleButton value="bulletList" selected={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                        <FormatListBulleted fontSize="small" />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Ordered List">
                    <ToggleButton value="orderedList" selected={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                        <FormatListNumbered fontSize="small" />
                    </ToggleButton>
                </Tooltip>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.5 } }} />

            <Box sx={{ display: 'flex', gap: { xs: 0.2, sm: 0.5 } }}>
                <Tooltip title="Table">
                    <IconButton size="small" onClick={handleTableClick} color={editor.isActive('table') ? 'primary' : 'default'}>
                        <TableChart fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Menu anchorEl={anchorEl} open={openTableMenu} onClose={handleTableClose}>
                    <MenuItem onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); handleTableClose(); }}>Insert 3x3 Table</MenuItem>
                    <MenuItem onClick={() => { editor.chain().focus().deleteTable().run(); handleTableClose(); }}>Delete Table</MenuItem>
                </Menu>

                <Tooltip title="Blockquote">
                    <IconButton size="small" color={editor.isActive('blockquote') ? 'primary' : 'default'} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                        <FormatQuote fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Code Block">
                    <IconButton size="small" color={editor.isActive('codeBlock') ? 'primary' : 'default'} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                        <Code fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Insert Image">
                    <IconButton size="small" onClick={() => uploadImage()}>
                        <AddPhotoAlternate fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Add Link">
                    <IconButton size="small" color={editor.isActive('link') ? 'primary' : 'default'} onClick={addLink}>
                        <LinkIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => {
            if (!prev) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            return !prev;
        });
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: { keepMarks: true, keepAttributes: false },
                orderedList: { keepMarks: true, keepAttributes: false },
            }),
            TextStyle, Color,
            Image.configure({ inline: true, allowBase64: true }),
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'blog-link' } }),
            Underline, Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
            TaskItem.configure({ nested: true }),
            TaskList, Placeholder.configure({ placeholder: 'Write something amazing...' }),
            FontFamily
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Upload image function - shared between button click and drag-drop
    const uploadImage = useCallback(async (file?: File) => {
        if (!editor) return;

        // If no file provided, show file picker
        if (!file) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e: any) => {
                const selectedFile = e.target.files[0];
                if (selectedFile) {
                    await uploadImage(selectedFile);
                }
            };
            input.click();
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be smaller than 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
            // Show loading placeholder
            editor.chain().focus().run();

            const response = await apiClient.post(endpoints.blog.uploadImage, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            let imageUrl = response.data.url;
            if (imageUrl.startsWith('/')) {
                imageUrl = `${API_BASE_URL}${imageUrl}`;
            }

            editor.chain().focus().setImage({ src: imageUrl }).run();
        } catch (error) {
            console.error('Failed to upload image', error);
            alert('Failed to upload image. Please try again.');
        }
    }, [editor]);

    // Drag and drop image upload
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(file => file.type.startsWith('image/'));

        if (imageFile && editor) {
            uploadImage(imageFile);
        }
    }, [editor, uploadImage]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    return (
        <Box sx={{
            border: isFullscreen ? 0 : 1,
            borderColor: 'divider',
            borderRadius: isFullscreen ? 0 : 2,
            overflow: isFullscreen ? 'auto' : 'hidden',
            minHeight: isFullscreen ? '100vh' : 450,
            display: 'flex', flexDirection: 'column',
            bgcolor: 'white',
            boxShadow: isFullscreen ? 'none' : '0 4px 20px rgba(0,0,0,0.05)',
            position: isFullscreen ? 'fixed' : 'relative',
            top: isFullscreen ? 0 : 'auto',
            left: isFullscreen ? 0 : 'auto',
            right: isFullscreen ? 0 : 'auto',
            bottom: isFullscreen ? 0 : 'auto',
            zIndex: isFullscreen ? 5000 : 1,
            transition: 'all 0.3s ease',
            '&:focus-within': { boxShadow: isFullscreen ? 'none' : '0 4px 30px rgba(37, 99, 235, 0.15)', borderColor: 'primary.main' }
        }}>
            <MenuBar
                editor={editor}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
                uploadImage={uploadImage}
            />
            <Box
                sx={{
                    p: { xs: 1, sm: 3 },
                    flexGrow: 1,
                    cursor: 'text',
                    minHeight: isFullscreen ? 'calc(100vh - 100px)' : '300px',
                    overflow: 'auto',
                    bgcolor: '#fff'
                }}
                onClick={() => editor?.chain().focus().run()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <EditorContent editor={editor} />
            </Box>
            <style>{`
                .ProseMirror {
                    min-height: 300px;
                    padding: 1rem;
                    outline: none;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    font-size: 1.05rem;
                    line-height: 1.75;
                    color: #0f172a;
                }
                @media (max-width: 600px) {
                    .ProseMirror { font-size: 1rem; padding: 0.5rem; }
                }

                .ProseMirror p { margin-bottom: 0.75em; }
                .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 { font-weight: 700; color: #1e293b; }
                
                .ProseMirror ul, .ProseMirror ol { padding: 0 1rem; margin: 0.5rem 1rem; }
                .ProseMirror blockquote {
                    border-left: 3px solid #616161;
                    padding: 1rem 1.5rem;
                    margin: 1.5rem 0;
                    font-style: italic;
                    color: #475569;
                    background: #f8fafc;
                    border-radius: 8px;
                }
                .ProseMirror pre {
                    background: #0f172a;
                    color: #f8fafc;
                    padding: 1.25rem;
                    border-radius: 8px;
                    font-family: 'JetBrains Mono', monospace;
                    overflow-x: auto;
                    margin: 1.5rem 0;
                }
                .ProseMirror code {
                    background-color: #f1f5f9;
                    color: #e11d48;
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                    font-size: 0.9em;
                }
                .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                    margin: 1.5rem 0;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }
                .ProseMirror .is-editor-empty:first-child::before {
                    color: #94a3b8;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .blog-link { color: #2563eb; text-decoration: underline; font-weight: 500; cursor: pointer; }
            `}</style>
        </Box>
    );
};

export default RichTextEditor;
