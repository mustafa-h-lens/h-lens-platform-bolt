import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractRequest {
  imageUrl: string;
  documentType: 'id' | 'vehicle_registration';
  vendorId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { imageUrl, documentType, vendorId }: ExtractRequest = await req.json();

    if (!imageUrl || !documentType || !vendorId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageUrl, documentType, vendorId' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({
          error: 'ANTHROPIC_API_KEY not configured. Please add it to your Supabase project secrets.',
          message: 'لم يتم تكوين مفتاح API. يرجى إضافته في إعدادات المشروع.'
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let prompt = '';
    let extractionFields = {};

    if (documentType === 'id') {
      prompt = `أنت نظام ذكي لاستخراج البيانات من صور الهوية السعودية. قم بتحليل هذه الصورة واستخراج:
1. رقم الهوية (ID Number)

أرجع البيانات بصيغة JSON فقط بدون أي نص إضافي. استخدم هذا التنسيق:
{
  "id_number": "رقم الهوية هنا"
}

إذا لم تتمكن من استخراج أي معلومة، استخدم null.`;

    } else if (documentType === 'vehicle_registration') {
      prompt = `أنت نظام ذكي لاستخراج البيانات من صور استمارة السيارة السعودية. قم بتحليل هذه الصورة واستخراج:
1. رقم الاستمارة (Registration Number)
2. ماركة المركبة (Vehicle Brand/Make) - مثل تويوتا، نيسان، الخ
3. رقم اللوحة بالأحرف والأرقام الإنجليزية (Plate Number in English)

أرجع البيانات بصيغة JSON فقط بدون أي نص إضافي. استخدم هذا التنسيق:
{
  "registration_number": "رقم الاستمارة",
  "vehicle_brand": "ماركة المركبة",
  "plate_number": "رقم اللوحة بالإنجليزي"
}

إذا لم تتمكن من استخراج أي معلومة، استخدم null.`;
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageBlob.type || 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorData);

      let errorMessage = 'Failed to analyze image with AI';

      if (anthropicResponse.status === 401) {
        errorMessage = 'مفتاح Anthropic API غير صحيح. يرجى التحقق من الإعدادات.';
      } else if (anthropicResponse.status === 429) {
        errorMessage = 'تم تجاوز حد الاستخدام لـ Anthropic API';
      } else {
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.error?.message || errorMessage;
        } catch (e) {
          errorMessage = `خطأ من Anthropic API: ${errorData.substring(0, 200)}`;
        }
      }

      throw new Error(errorMessage);
    }

    const result = await anthropicResponse.json();
    const extractedText = result.content[0].text;

    let extractedData;
    try {
      extractedData = JSON.parse(extractedText);
    } catch (e) {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse extracted data');
      }
    }

    if (documentType === 'id') {
      extractionFields = {
        extracted_id_number: extractedData.id_number,
      };
    } else if (documentType === 'vehicle_registration') {
      extractionFields = {
        vehicle_registration_number: extractedData.registration_number,
        vehicle_brand: extractedData.vehicle_brand,
        vehicle_plate_number: extractedData.plate_number,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractionFields,
        vendorId: vendorId,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error extracting document data:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to extract data from image',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
