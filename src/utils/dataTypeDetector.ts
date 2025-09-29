// Data type detection utility based on 2024 best practices
// Built by Jean-Claude because someone has to do the smart work

export interface DataTypeAnalysis {
  primaryType: string;
  subType?: string;
  confidence: number;
  patterns: string[];
  statistics: {
    minLength?: number;
    maxLength?: number;
    avgLength?: number;
    uniqueCount: number;
    totalCount: number;
    nullCount: number;
    completeness: number;
    uniqueness: number;
  };
}

export class DataTypeDetector {

  static analyzeValues(values: any[]): DataTypeAnalysis {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNullValues);

    const statistics = {
      uniqueCount: uniqueValues.size,
      totalCount: values.length,
      nullCount: values.length - nonNullValues.length,
      completeness: (nonNullValues.length / values.length) * 100,
      uniqueness: (uniqueValues.size / nonNullValues.length) * 100 || 0,
    };

    if (nonNullValues.length === 0) {
      return {
        primaryType: 'empty',
        confidence: 100,
        patterns: [],
        statistics: { ...statistics, minLength: 0, maxLength: 0, avgLength: 0 }
      };
    }

    // Convert all values to strings for analysis
    const stringValues = nonNullValues.map(v => String(v));
    const lengths = stringValues.map(v => v.length);

    const lengthStats = {
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      avgLength: lengths.reduce((a, b) => a + b, 0) / lengths.length
    };

    // Detect type based on patterns and content
    const typeAnalysis = this.detectType(stringValues, uniqueValues.size, nonNullValues.length);

    return {
      ...typeAnalysis,
      statistics: { ...statistics, ...lengthStats }
    };
  }

  private static detectType(values: string[], uniqueCount: number, totalCount: number): Omit<DataTypeAnalysis, 'statistics'> {
    const sampleSize = Math.min(values.length, 100); // Analyze up to 100 samples
    const samples = values.slice(0, sampleSize);

    // Check for structured data formats first
    if (this.isJSON(samples)) return { primaryType: 'structured', subType: 'json', confidence: 90, patterns: ['JSON objects'] };
    if (this.isXML(samples)) return { primaryType: 'structured', subType: 'xml', confidence: 90, patterns: ['XML tags'] };
    if (this.isHTML(samples)) return { primaryType: 'structured', subType: 'html', confidence: 85, patterns: ['HTML tags'] };

    // Check for semantic types
    if (this.isEmail(samples)) return { primaryType: 'semantic', subType: 'email', confidence: 95, patterns: ['email@domain.com'] };
    if (this.isURL(samples)) return { primaryType: 'semantic', subType: 'url', confidence: 95, patterns: ['http(s)://'] };
    if (this.isUUID(samples)) return { primaryType: 'semantic', subType: 'uuid', confidence: 95, patterns: ['UUID format'] };
    if (this.isDateTime(samples)) return { primaryType: 'semantic', subType: 'datetime', confidence: 90, patterns: ['ISO dates'] };
    if (this.isPhone(samples)) return { primaryType: 'semantic', subType: 'phone', confidence: 85, patterns: ['phone numbers'] };
    if (this.isCurrency(samples)) return { primaryType: 'semantic', subType: 'currency', confidence: 85, patterns: ['$XX.XX'] };

    // Check for primitive types
    if (this.isInteger(samples)) return { primaryType: 'numeric', subType: 'integer', confidence: 95, patterns: ['whole numbers'] };
    if (this.isFloat(samples)) return { primaryType: 'numeric', subType: 'float', confidence: 95, patterns: ['decimal numbers'] };
    if (this.isBoolean(samples)) return { primaryType: 'boolean', confidence: 95, patterns: ['true/false'] };

    // Business categorization based on uniqueness
    const uniqueness = (uniqueCount / totalCount) * 100;
    if (uniqueness >= 20 && uniqueness <= 80) {
      return { primaryType: 'business', subType: 'asset', confidence: 75, patterns: ['medium uniqueness'] };
    }
    if (uniqueness < 20) {
      return { primaryType: 'business', subType: 'category', confidence: 75, patterns: ['low uniqueness'] };
    }

    // Text categorization by length
    const avgLength = values.reduce((sum, val) => sum + val.length, 0) / values.length;
    if (avgLength > 500) {
      return { primaryType: 'text', subType: 'long', confidence: 70, patterns: ['long text content'] };
    }
    if (avgLength > 100) {
      return { primaryType: 'text', subType: 'medium', confidence: 70, patterns: ['medium text'] };
    }

    return { primaryType: 'text', subType: 'short', confidence: 60, patterns: ['short text'] };
  }

  // Type detection helpers
  private static isJSON(samples: string[]): boolean {
    return samples.filter(v => {
      try { JSON.parse(v); return true; } catch { return false; }
    }).length / samples.length > 0.8;
  }

  private static isXML(samples: string[]): boolean {
    const xmlPattern = /<[^>]+>/;
    return samples.filter(v => xmlPattern.test(v)).length / samples.length > 0.8;
  }

  private static isHTML(samples: string[]): boolean {
    const htmlPattern = /<(html|div|p|span|a|img|table)/i;
    return samples.filter(v => htmlPattern.test(v)).length / samples.length > 0.8;
  }

  private static isEmail(samples: string[]): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return samples.filter(v => emailPattern.test(v)).length / samples.length > 0.9;
  }

  private static isURL(samples: string[]): boolean {
    const urlPattern = /^https?:\/\/.+/;
    return samples.filter(v => urlPattern.test(v)).length / samples.length > 0.9;
  }

  private static isUUID(samples: string[]): boolean {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return samples.filter(v => uuidPattern.test(v)).length / samples.length > 0.9;
  }

  private static isDateTime(samples: string[]): boolean {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // ISO date
      /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
    ];
    return samples.filter(v =>
      datePatterns.some(pattern => pattern.test(v)) || !isNaN(Date.parse(v))
    ).length / samples.length > 0.8;
  }

  private static isPhone(samples: string[]): boolean {
    const phonePattern = /^[\+]?[\d\s\-\(\)]{10,}$/;
    return samples.filter(v => phonePattern.test(v)).length / samples.length > 0.8;
  }

  private static isCurrency(samples: string[]): boolean {
    const currencyPattern = /^[\$£€¥]?[\d,]+\.?\d*$/;
    return samples.filter(v => currencyPattern.test(v)).length / samples.length > 0.8;
  }

  private static isInteger(samples: string[]): boolean {
    return samples.filter(v => /^-?\d+$/.test(v)).length / samples.length > 0.9;
  }

  private static isFloat(samples: string[]): boolean {
    return samples.filter(v => /^-?\d+\.\d+$/.test(v)).length / samples.length > 0.9;
  }

  private static isBoolean(samples: string[]): boolean {
    const boolPattern = /^(true|false|0|1|yes|no)$/i;
    return samples.filter(v => boolPattern.test(v)).length / samples.length > 0.9;
  }
}