import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import SectionContainer from '../ui/SectionContainer';

const TestimonialsSection = () => {
  const testimonials = [
    {
      content:
        "Customate.ai transformed our customer support. We've reduced response times by 80% and can now provide 24/7 assistance without increasing our staff. The industry-specific training made it feel like a natural extension of our team from day one.",
      author: "Sarah Johnson",
      position: "Head of Customer Success",
      company: "TechNova Solutions",
      image: "/images/testimonials/sarah-johnson.jpg"
    },
    {
      content:
        "The knowledge base integration is seamless. We uploaded our product documentation and within hours had a chatbot that could accurately answer technical questions about our software. Our support tickets have decreased by 40% since implementation.",
      author: "Michael Chen",
      position: "CTO",
      company: "DataFlow Systems",
      image: "/images/testimonials/michael-chen.jpg"
    },
    {
      content:
        "As an e-commerce business, we needed a chatbot that understood product recommendations and order tracking. Customate.ai delivered exactly that, plus the ability to personalize the shopping experience. Our conversion rate has increased by 25%.",
      author: "Jessica Rodriguez",
      position: "E-commerce Director",
      company: "StyleHub Retail",
      image: "/images/testimonials/jessica-rodriguez.jpg"
    },
    {
      content:
        "The white-labeling features are fantastic. Our chatbot perfectly matches our brand's look and feel. Customers don't even realize they're talking to an AI - they just know they're getting fast, accurate answers to their questions.",
      author: "Alex Thompson",
      position: "Marketing Manager",
      company: "Horizon Media",
      image: "/images/testimonials/alex-thompson.jpg"
    },
    {
      content:
        "Implementation was incredibly smooth. We were up and running in less than a day, and the onboarding support was excellent. The analytics dashboard gives us insights we never had before about what our customers are asking.",
      author: "David Williams",
      position: "Operations Director",
      company: "Global Services Inc.",
      image: "/images/testimonials/david-williams.jpg"
    },
    {
      content:
        "We tried several chatbot solutions before finding Customate.ai. The difference in accuracy and natural conversation flow is remarkable. Our customer satisfaction scores have increased by 35% since making the switch.",
      author: "Rachel Foster",
      position: "Customer Experience Manager",
      company: "Innovate Health",
      image: "/images/testimonials/rachel-foster.jpg"
    },
  ];

  const TestimonialCard = ({ testimonial, index }) => {
    const [ref, inView] = useInView({
      triggerOnce: true,
      threshold: 0.1,
    });

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="bg-white p-6 rounded-lg shadow-md border border-gray-100"
      >
        <div className="flex flex-col h-full">
          <div className="flex-grow">
            <svg className="h-8 w-8 text-primary-400 mb-3" fill="currentColor" viewBox="0 0 32 32">
              <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
            </svg>
            <p className="text-gray-600 mb-4">{testimonial.content}</p>
          </div>
          <div className="flex items-center mt-4">
            <div className="flex-shrink-0">
              <img
                className="h-10 w-10 rounded-full object-cover"
                src={testimonial.image || `https://ui-avatars.com/api/?name=${testimonial.author}&background=random`}
                alt={testimonial.author}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{testimonial.author}</p>
              <div className="text-xs text-gray-500">
                {testimonial.position}, {testimonial.company}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <SectionContainer background="light" id="testimonials">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            What Our Customers Say
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Hear from businesses that have transformed their customer engagement with Customate.ai
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} testimonial={testimonial} index={index} />
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-base text-gray-600">
          Join hundreds of satisfied businesses using Customate.ai to enhance their customer experience.
        </p>
        <div className="mt-6">
          <a
            href="https://app.customate.ai/register"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            Start Your Free Trial
          </a>
        </div>
      </div>
    </SectionContainer>
  );
};

export default TestimonialsSection;