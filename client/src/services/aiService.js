import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

/**
 * AI Service
 * 
 * Handles AI-powered health explanations, summaries, and medical information processing.
 * Integrates with backend Groq API adapter with demo fallback.
 */
const aiService = {
  /**
   * Get AI explanation for a health record
   * @param {string} recordId - Record ID
   * @param {string} recordType - Type of record (lab_result, radiology, etc.)
   * @param {Object} recordData - Record data to explain
   * @param {string} language - Target language (default: English)
   * @returns {Promise<string>} AI-generated explanation
   */
  async getHealthExplanation(recordId, recordType, recordData, language = 'English') {
    try {
      const response = await axios.post(`${API_BASE_URL}/patients/ai-summary`, {
        recordId,
        recordType,
        recordData,
        language,
        mode: 'explanation',
      });

      if (response.data.success) {
        return response.data.explanation;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get explanation');
      }
    } catch (error) {
      console.error('AI explanation error:', error);
      // Return demo explanation if API fails
      return this.getDemoExplanation(recordType, language);
    }
  },

  /**
   * Get AI health summary for patient
   * @param {string} patientId - Patient ID
   * @param {Object} healthData - Patient health data
   * @param {string} language - Target language
   * @returns {Promise<Object>} Summary with key insights
   */
  async getHealthSummary(patientId, healthData, language = 'English') {
    try {
      const response = await axios.post(`${API_BASE_URL}/patients/${patientId}/ai-summary`, {
        healthData,
        language,
        mode: 'summary',
      });

      if (response.data.success) {
        return response.data.summary;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get summary');
      }
    } catch (error) {
      console.error('AI summary error:', error);
      return {
        title: 'Health Summary',
        keyPoints: [
          'Unable to generate AI summary at this time.',
          'Please try again later or contact support.',
        ],
      };
    }
  },

  /**
   * Get demo/fallback explanation (when API unavailable)
   * @private
   */
  getDemoExplanation(recordType, language = 'English') {
    const explanations = {
      lab_result: {
        English:
          'Your lab results show the measurements of various components in your blood or other body fluids. These values help your healthcare provider assess your overall health and detect potential issues early. All values within normal ranges indicate good health in these areas. Always consult with your healthcare provider to discuss what these results mean for you personally.',
        Hindi:
          'आपके प्रयोगशाला परिणाम आपके रक्त या अन्य शरीर के तरल पदार्थों में विभिन्न घटकों की माप दिखाते हैं। ये मान आपके स्वास्थ्य सेवा प्रदाता को आपके समग्र स्वास्थ्य का आकलन करने और संभावित समस्याओं का जल्दी पता लगाने में मदद करते हैं।',
        Spanish:
          'Sus resultados de laboratorio muestran las medidas de varios componentes en su sangre u otros fluidos corporales. Estos valores ayudan a su proveedor de atención médica a evaluar su salud general y detectar problemas potenciales a tiempo.',
      },
      radiology: {
        English:
          'Radiology images such as X-rays, CT scans, or ultrasounds provide visual information about the structures inside your body. These images help your healthcare provider diagnose conditions, monitor existing problems, and guide treatment decisions. Your healthcare provider will review these images and discuss the findings with you.',
        Hindi:
          'रेडियोलॉजी इमेज जैसे एक्स-रे, सीटी स्कैन, या अल्ट्रासाउंड आपके शरीर के अंदर की संरचनाओं के बारे में दृश्य जानकारी प्रदान करते हैं।',
        Spanish:
          'Las imágenes de radiología como radiografías, tomografías o ecografías proporcionan información visual sobre las estructuras dentro de su cuerpo.',
      },
      medication: {
        English:
          'Medications help manage various health conditions by altering specific bodily functions. It is important to take medications exactly as prescribed by your healthcare provider. If you experience any side effects or have questions about your medications, contact your healthcare provider immediately.',
        Hindi:
          'दवाएं विभिन्न स्वास्थ्य स्थितियों को प्रबंधित करने में मदद करती हैं। अपनी दवाओं के बारे में किसी भी प्रश्न के लिए अपने स्वास्थ्य सेवा प्रदाता से संपर्क करें।',
        Spanish:
          'Los medicamentos ayudan a controlar varias condiciones de salud. Es importante tomar los medicamentos exactamente como se prescribieron.',
      },
      vaccination: {
        English:
          'Vaccinations are preventive treatments that help your body develop immunity to specific diseases. By receiving recommended vaccinations, you protect yourself and those around you from infectious diseases. Keep your vaccination records updated as recommended by health authorities.',
        Hindi:
          'टीकाकरण निवारक उपचार हैं जो आपके शरीर को विशिष्ट बीमारियों के प्रति प्रतिरक्षा विकसित करने में मदद करते हैं।',
        Spanish:
          'Las vacunas son tratamientos preventivos que ayudan a su cuerpo a desarrollar inmunidad a enfermedades específicas.',
      },
    };

    return (
      explanations[recordType]?.[language] ||
      explanations[recordType]?.['English'] ||
      'No explanation available for this record type.'
    );
  },

  /**
   * List supported languages for AI explanations
   * @returns {Array<string>} List of supported language names
   */
  getSupportedLanguages() {
    return [
      'English',
      'Hindi',
      'Kannada',
      'Telugu',
      'Tamil',
      'Malayalam',
      'Spanish',
      'French',
    ];
  },
};

export default aiService;
