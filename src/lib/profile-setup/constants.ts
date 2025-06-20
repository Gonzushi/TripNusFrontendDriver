// Generate years from 2010 to current year
const currentYear = new Date().getFullYear();
export const VEHICLE_YEARS = Array.from(
  { length: currentYear - 2010 + 1 },
  (_, i) => String(currentYear - i)
) as readonly string[];

export type VehicleTypeOption = {
  label: string;
  value: 'car' | 'motorcycle';
};

export type GenderTypeOption = {
  label: string;
  value: 'male' | 'female';
};


export const VEHICLE_TYPES: readonly VehicleTypeOption[] = [
  { label: 'Mobil', value: 'car' },
  { label: 'Sepeda Motor', value: 'motorcycle' },
] as const;

export const GENDER_OPTIONS: readonly GenderTypeOption[] = [
  { label: 'Laki-laki', value: 'male' },
  { label: 'Perempuan', value: 'female' },
] as const;

export const DRIVER_LICENSE_CLASSES = ['A', 'C'] as const;

// Vehicle brands and colors

export const VEHICLE_COLORS = [
  'Hitam',
  'Putih',
  'Silver',
  'Abu-abu',
  'Merah',
  'Biru',
  'Hijau',
  'Coklat',
  'Emas',
  'Kuning',
] as const;

export const VEHICLE_BRANDS = [
  'Acura',
  'Alfa Romeo',
  'Aston Martin',
  'Aprilia',
  'Audi',
  'Bajaj',
  'Benelli',
  'Bentley',
  'BMW',
  'Bimota',
  'Buick',
  'BYD',
  'Cadillac',
  'Chevrolet',
  'Citroën',
  'Daihatsu',
  'Ducati',
  'Ferrari',
  'Fiat',
  'Ford',
  'Geely',
  'Great Wall Motor',
  'Harley-Davidson',
  'Honda',
  'Husqvarna',
  'Hyundai',
  'Indian',
  'Infiniti',
  'Isuzu',
  'Jaguar',
  'Kawasaki',
  'Kia',
  'KTM',
  'Lamborghini',
  'Land Rover',
  'Lexus',
  'Mazda',
  'Mercedes-Benz',
  'Mitsubishi',
  'MV Agusta',
  'Nissan',
  'Norton',
  'Peugeot',
  'Porsche',
  'Renault',
  'Rolls-Royce',
  'Royal Enfield',
  'Subaru',
  'Suzuki',
  'Tesla',
  'Toyota',
  'Triumph',
  'Volkswagen',
  'Volvo',
  'Wuling',
  'Yamaha',
  'Zero Motorcycles',
] as const;
