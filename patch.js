const fs = require('fs');

// Patch FamilyAlbums.tsx
let file = '/Users/ranjit/Downloads/Pandara_samaja/portal-app/src/pages/FamilyAlbums.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
    'const [albums, setAlbums] = useState<FamilyAlbum[]>(MOCK_ALBUMS);',
    `const [albums, setAlbums] = useState<FamilyAlbum[]>([]);
    
    useEffect(() => {
        fetchAlbums();
    }, []);

    const fetchAlbums = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/portal/family/albums', {
                headers: { 'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\` }
            });
            const data = await res.json();
            if (data.success) {
                // Formatting photos array
                const fetchedAlbums = data.albums.map((a: any) => ({
                    id: a.id.toString(),
                    title: a.title,
                    description: a.description,
                    coverUrl: a.cover_url ? \`http://localhost:5000\${a.cover_url}\` : '',
                    photos: a.photo_count > 0 ? Array(parseInt(a.photo_count)).fill({ url: '' }) : [], 
                    createdAt: new Date(a.created_at).toISOString().split('T')[0],
                    isPrivate: true
                }));
                setAlbums(fetchedAlbums);
            }
        } catch (e) {
            console.error('Error fetching albums:', e);
            toast.error('Failed to load family albums');
        }
    };`
);

data = data.replace(
    /import \{ useState \} from 'react';/,
    `import { useState, useEffect } from 'react';`
);

data = data.replace(
    /const handleCreateAlbum = \(\) => \{[\s\S]*?toast\.success\('Album created!'\);\n {4}\};/,
    `const handleCreateAlbum = async () => {
        if (!newAlbumTitle.trim()) { toast.error('Please enter an album title'); return; }
        try {
            const res = await fetch('http://localhost:5000/api/portal/family/albums', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\` 
                },
                body: JSON.stringify({
                    title: newAlbumTitle,
                    description: newAlbumDesc
                })
            });
            const data = await res.json();
            if (data.success) {
                setAlbums([{
                    id: data.album.id.toString(),
                    title: data.album.title,
                    description: data.album.description,
                    coverUrl: '',
                    photos: [],
                    isPrivate: true,
                    createdAt: new Date(data.album.created_at).toISOString().split('T')[0]
                }, ...albums]);
                setNewAlbumTitle('');
                setNewAlbumDesc('');
                setShowCreateModal(false);
                toast.success('Album created!');
            }
        } catch (e) {
            toast.error('Failed to create album');
        }
    };`
);

data = data.replace(
    /const handleDeleteAlbum = \(albumId: string\) => \{[\s\S]*?toast\.success\('Album deleted'\);\n {4}\};/,
    `const handleDeleteAlbum = async (albumId: string) => {
        if(!confirm('Are you sure you want to delete this album?')) return;
        try {
            const res = await fetch(\`http://localhost:5000/api/portal/family/albums/\${albumId}\`, {
                method: 'DELETE',
                headers: { 'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\` }
            });
            const data = await res.json();
            if (data.success) {
                setAlbums(prev => prev.filter(a => a.id !== albumId));
                if (selectedAlbum?.id === albumId) setSelectedAlbum(null);
                toast.success('Album deleted');
            }
        } catch (e) {
            toast.error('Failed to delete album');
        }
    };`
);

data = data.replace(
    /const handleAddPhoto = \(albumId: string, e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?e\.target\.value = '';\n {4}\};/,
    `const handleAddPhoto = async (albumId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const formData = new FormData();
        files.forEach(file => formData.append('photos', file));

        try {
            const res = await fetch(\`http://localhost:5000/api/portal/family/albums/\${albumId}/photos\`, {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\`
                },
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                // Fetch the complete album again, or update incrementally 
                // Using simple re-fetch for simplicity
                fetchAlbums();
                setSelectedAlbum(null); // Return to grid or close to refresh
                toast.success(\`\${files.length} photo(s) uploaded successfully!\`);
            }
        } catch (err) {
            console.error('Upload err', err);
            toast.error('Failed to upload photos');
        }

        e.target.value = '';
    };`
);

fs.writeFileSync(file, data);

// Patch FamilyEvents.tsx
let eventsFile = '/Users/ranjit/Downloads/Pandara_samaja/portal-app/src/pages/FamilyEvents.tsx';
let eventsData = fs.readFileSync(eventsFile, 'utf8');

eventsData = eventsData.replace(
    /import \{ useState \} from 'react';/,
    `import { useState, useEffect } from 'react';`
);

eventsData = eventsData.replace(
    'const [events, setEvents] = useState<FamilyEvent[]>(MOCK_EVENTS);',
    `const [events, setEvents] = useState<FamilyEvent[]>([]);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/portal/family/events', {
                headers: { 'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\` }
            });
            const data = await res.json();
            if (data.success) {
                setEvents(data.events.map((e: any) => ({
                    ...e,
                    id: e.id.toString(),
                    date: new Date(e.event_date).toISOString().split('T')[0],
                    attendees: [] // Optional field, RSVP query needed to join attendees if required
                })));
            }
        } catch (error) {
            toast.error('Failed to load events');
        }
    };`
);

eventsData = eventsData.replace(
    /const handleCreate = \(\) => \{[\s\S]*?toast\.success\('Family event created!'\);\n {4}\};/,
    `const handleCreate = async () => {
        if (!form.title.trim() || !form.date) { toast.error('Title and date are required'); return; }
        try {
            const res = await fetch('http://localhost:5000/api/portal/family/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\`
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                fetchEvents();
                setForm({ title: '', description: '', date: '', time: '', location: '', type: 'gathering' });
                setShowCreateModal(false);
                toast.success('Family event created!');
            }
        } catch (e) {
            toast.error('Failed to create event');
        }
    };`
);

eventsData = eventsData.replace(
    /const handleRSVP = \(eventId: string\) => \{[\s\S]*?\}\)\);\n {4}\};/,
    `const handleRSVP = async (eventId: string) => {
        try {
            const res = await fetch(\`http://localhost:5000/api/portal/family/events/\${eventId}/rsvp\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\`
                },
                body: JSON.stringify({ status: 'going' })
            });
            if(res.ok) {
                toast.success('RSVP confirmed');
                fetchEvents();
            }
        } catch (e) {
            toast.error('Failed to update RSVP');
        }
    };`
);

eventsData = eventsData.replace(
    /const handleDelete = \(eventId: string\) => \{[\s\S]*?toast\.success\('Event deleted'\);\n {4}\};/,
    `const handleDelete = async (eventId: string) => {
        if(!confirm('Delete this event?')) return;
        try {
            const res = await fetch(\`http://localhost:5000/api/portal/family/events/\${eventId}\`, {
                method: 'DELETE',
                headers: { 'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\` }
            });
            if(res.ok) {
                toast.success('Event deleted');
                fetchEvents();
            }
        } catch (e) {
            toast.error('Failed to delete event');
        }
    };`
);

fs.writeFileSync(eventsFile, eventsData);

// Patch FamilyLogin.tsx
let accountsFile = '/Users/ranjit/Downloads/Pandara_samaja/portal-app/src/pages/FamilyLogin.tsx';
let accountsData = fs.readFileSync(accountsFile, 'utf8');

accountsData = accountsData.replace(
    /import \{ useState \} from 'react';/,
    `import { useState, useEffect } from 'react';`
);

accountsData = accountsData.replace(
    'const [accounts, setAccounts] = useState<FamilyAccount[]>(MOCK_ACCOUNTS);',
    `const [accounts, setAccounts] = useState<FamilyAccount[]>([]);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/portal/family/accounts', {
                headers: { 'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\` }
            });
            const data = await res.json();
            if (data.success) {
                setAccounts(data.accounts.map((a: any) => ({
                    id: a.id.toString(),
                    name: a.name,
                    username: a.username,
                    relation: 'Family Member',
                    isActive: a.is_active,
                    lastLogin: a.created_at // placeholder
                })));
            }
        } catch (error) {
            toast.error('Failed to load accounts');
        }
    };`
);

accountsData = accountsData.replace(
    /const handleCreate = \(\) => \{[\s\S]*?toast\.success\(`Account created for \$\{form\.name\}!`\);\n {4}\};/,
    `const handleCreate = async () => {
        if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
            toast.error('All fields are required');
            return;
        }
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        try {
            const res = await fetch('http://localhost:5000/api/portal/family/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\`
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                fetchAccounts();
                setForm({ name: '', relation: '', username: '', password: '' });
                setShowCreateModal(false);
                toast.success('Account created!');
            } else {
                toast.error(data.message || 'Failed to create account');
            }
        } catch (e) {
            toast.error('Failed to create account');
        }
    };`
);

accountsData = accountsData.replace(
    /const toggleActive = \(accountId: string\) => \{[\s\S]*?toast\.success\(.*?\);\n {4}\};/,
    `const toggleActive = async (accountId: string) => {
        const acc = accounts.find(a => a.id === accountId);
        try {
            const res = await fetch(\`http://localhost:5000/api/portal/family/accounts/\${accountId}/status\`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\`
                },
                body: JSON.stringify({ status: !acc?.isActive })
            });
            if (res.ok) {
                fetchAccounts();
                toast.success('Account status updated');
            }
        } catch (e) {
            toast.error('Failed to update status');
        }
    };`
);

accountsData = accountsData.replace(
    /const deleteAccount = \(accountId: string\) => \{[\s\S]*?toast\.success\(.*?\);\n {4}\};/,
    `const deleteAccount = async (accountId: string) => {
        if(!confirm('Are you sure you want to delete this account?')) return;
        try {
            const res = await fetch(\`http://localhost:5000/api/portal/family/accounts/\${accountId}\`, {
                method: 'DELETE',
                headers: { 'Authorization': \`Bearer \${localStorage.getItem('portalToken')}\` }
            });
            if (res.ok) {
                fetchAccounts();
                toast.success('Account deleted');
            }
        } catch (e) {
            toast.error('Failed to delete account');
        }
    };`
);

fs.writeFileSync(accountsFile, accountsData);
console.log('Successfully patched all Phase 6 Family logic components.');
