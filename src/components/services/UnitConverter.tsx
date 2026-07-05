import React, { useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, MenuItem, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

type Category = 'length' | 'weight' | 'temperature' | 'volume';

// Every unit's factor is relative to the category's base unit (meters, kilograms, liters).
// Temperature isn't linear-scalable so it gets its own conversion functions below.
const UNITS: Record<Exclude<Category, 'temperature'>, Record<string, number>> = {
    length: { Meters: 1, Kilometers: 1000, Centimeters: 0.01, Millimeters: 0.001, Miles: 1609.34, Yards: 0.9144, Feet: 0.3048, Inches: 0.0254 },
    weight: { Kilograms: 1, Grams: 0.001, Milligrams: 0.000001, Pounds: 0.453592, Ounces: 0.0283495, Tons: 1000 },
    volume: { Liters: 1, Milliliters: 0.001, 'US Gallons': 3.78541, Quarts: 0.946353, Cups: 0.24, 'Fluid Ounces': 0.0295735 },
};

const CATEGORIES: { value: Category; label: string }[] = [
    { value: 'length', label: 'Length' },
    { value: 'weight', label: 'Weight' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'volume', label: 'Volume' },
];

const toCelsius = (v: number, unit: string): number => {
    if (unit === 'Celsius') return v;
    if (unit === 'Fahrenheit') return (v - 32) * (5 / 9);
    return v - 273.15; // Kelvin
};
const fromCelsius = (c: number, unit: string): number => {
    if (unit === 'Celsius') return c;
    if (unit === 'Fahrenheit') return c * (9 / 5) + 32;
    return c + 273.15; // Kelvin
};

const UnitConverter: React.FC = () => {
    const [category, setCategory] = useState<Category>('length');
    const [fromUnit, setFromUnit] = useState('Meters');
    const [toUnit, setToUnit] = useState('Feet');
    const [input, setInput] = useState('1');

    const unitOptions = category === 'temperature' ? ['Celsius', 'Fahrenheit', 'Kelvin'] : Object.keys(UNITS[category]);

    const handleCategoryChange = (cat: Category) => {
        setCategory(cat);
        const opts = cat === 'temperature' ? ['Celsius', 'Fahrenheit', 'Kelvin'] : Object.keys(UNITS[cat]);
        setFromUnit(opts[0]);
        setToUnit(opts[1] ?? opts[0]);
    };

    const result = useMemo(() => {
        const value = parseFloat(input);
        if (Number.isNaN(value)) return '';

        if (category === 'temperature') {
            return fromCelsius(toCelsius(value, fromUnit), toUnit).toFixed(4).replace(/\.?0+$/, '');
        }
        const factors = UNITS[category];
        const meters = value * factors[fromUnit];
        const converted = meters / factors[toUnit];
        return converted.toFixed(6).replace(/\.?0+$/, '');
    }, [input, fromUnit, toUnit, category]);

    const swap = () => {
        setFromUnit(toUnit);
        setToUnit(fromUnit);
    };

    return (
        <ServicePageShell
            icon={SwapHoriz}
            title="Unit Converter"
            subtitle="Convert length, weight, temperature, and volume between common units — instantly, entirely in your browser."
            about="Converts values between common units across four categories — length, weight, temperature, and volume — with conversion happening instantly in your browser as you type. Length, weight, and volume conversions use a simple linear factor relative to a base unit (meters, kilograms, or liters); temperature uses proper Celsius/Fahrenheit/Kelvin formulas since temperature scales aren't simple multiples of each other. Nothing is sent to a server, so it keeps working offline once the page has loaded."
            howToSteps={[
                { name: 'Pick a category', text: 'Choose Length, Weight, Temperature, or Volume from the toggle buttons at the top.' },
                { name: 'Enter a value', text: 'Type a number into the Value field.' },
                { name: 'Choose the units', text: 'Select the From and To units from the two dropdowns.' },
                { name: 'Read the result', text: 'The converted value updates instantly, along with a plain-language summary at the bottom (e.g. "1 Meters = 3.28084 Feet").' },
                { name: 'Swap units', text: 'Click the rotated swap icon between the From and To fields to instantly flip which unit you convert from and to.' },
            ]}
            faq={[
                { question: 'How accurate are the conversions?', answer: 'Length, weight, and volume conversions use standard conversion factors and round to 6 decimal places; temperature conversions round to 4 decimal places using the standard Celsius/Fahrenheit/Kelvin formulas.' },
                { question: 'Why can\'t I mix units from different categories?', answer: 'Each category — length, weight, temperature, volume — has its own unit list because the underlying math is different; switching category resets both dropdowns to that category\'s units.' },
                { question: 'Does this tool store or send my numbers anywhere?', answer: 'No — all conversion happens locally in your browser with plain JavaScript; nothing is transmitted or logged.' },
                { question: 'What units are supported in each category?', answer: 'Length: meters, kilometers, centimeters, millimeters, miles, yards, feet, inches. Weight: kilograms, grams, milligrams, pounds, ounces, tons. Temperature: Celsius, Fahrenheit, Kelvin. Volume: liters, milliliters, US gallons, quarts, cups, fluid ounces.' },
            ]}
        >
            <Seo title="Unit Converter - Length, Weight, Temperature & Volume" />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
            }}>
                <CardContent sx={{ p: 1 }}>
                    <ToggleButtonGroup
                        value={category}
                        exclusive
                        onChange={(_, v) => v && handleCategoryChange(v)}
                        fullWidth
                        sx={{ mb: 3 }}
                    >
                        {CATEGORIES.map((c) => (
                            <ToggleButton key={c.value} value={c.value} sx={{ textTransform: 'none' }}>
                                {c.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>

                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 2 }}>
                        <TextField
                            label="Value"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            type="number"
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            select
                            label="From"
                            value={fromUnit}
                            onChange={(e) => setFromUnit(e.target.value)}
                            sx={{ flex: 1.4 }}
                        >
                            {unitOptions.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                        </TextField>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                        <SwapHoriz
                            onClick={swap}
                            sx={{ cursor: 'pointer', color: 'primary.main', transform: 'rotate(90deg)', '&:hover': { opacity: 0.7 } }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 3 }}>
                        <Box sx={{
                            flex: 1,
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            fontFamily: 'monospace',
                            fontSize: '1.15rem',
                            fontWeight: 700,
                            color: 'primary.main',
                            wordBreak: 'break-all',
                        }}>
                            {result || '—'}
                        </Box>
                        <TextField
                            select
                            label="To"
                            value={toUnit}
                            onChange={(e) => setToUnit(e.target.value)}
                            sx={{ flex: 1.4 }}
                        >
                            {unitOptions.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                        </TextField>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                        {input || 0} {fromUnit} = {result || '—'} {toUnit}
                    </Typography>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default UnitConverter;
