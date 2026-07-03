import React, { useState } from 'react';
import { Paper, Grid, TextField, Button, Snackbar, Alert } from '@mui/material';
import { Send } from '@mui/icons-material';

const ContactForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [open, setOpen] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Fake submit - replace with real API call as needed
        console.log('Hire enquiry:', form);
        setOpen(true);
        setForm({ name: '', email: '', message: '' });
        if (onSuccess) onSuccess();
    };

    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField required fullWidth label="Name" name="name" value={form.name} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField required fullWidth label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField required fullWidth multiline rows={4} label="Message" name="message" value={form.message} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sx={{ textAlign: 'right' }}>
                        <Button type="submit" variant="contained" endIcon={<Send />} sx={{ borderRadius: 2 }}>
                            Send Enquiry
                        </Button>
                    </Grid>
                </Grid>
            </form>

            <Snackbar open={open} autoHideDuration={6000} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setOpen(false)} severity="success" sx={{ width: '100%' }}>
                    Thanks! Your enquiry has been sent — we'll get back to you shortly.
                </Alert>
            </Snackbar>
        </Paper>
    );
};

export default ContactForm;
