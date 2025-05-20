import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

// Simple blog posts data
const blogPosts = [
  {
    id: 1,
    title: "How AI Chatbots Are Transforming Customer Support",
    excerpt: "Discover how businesses are leveraging AI-powered chatbots to provide 24/7 support, reduce costs, and improve customer satisfaction.",
    author: "Sarah Johnson",
    date: "May 12, 2025",
    category: "Customer Support",
  },
  {
    id: 2,
    title: "5 Ways to Train Your AI Chatbot for Better Conversations",
    excerpt: "Learn the best practices for training your chatbot to handle complex customer inquiries and provide more human-like responses.",
    author: "Michael Chen",
    date: "May 5, 2025",
    category: "Tutorial",
  },
  {
    id: 3,
    title: "The Future of NLP: What's Next for Conversational AI",
    excerpt: "Explore the latest advancements in Natural Language Processing and how they're shaping the future of AI chatbots.",
    author: "Emily Carter",
    date: "April 28, 2025",
    category: "Industry Insights",
  },
  {
    id: 4,
    title: "Case Study: How FinTech Startup Reduced Support Tickets by 67%",
    excerpt: "See how a growing fintech company implemented an AI chatbot to handle common customer inquiries and dramatically reduced their support workload.",
    author: "James Wilson",
    date: "April 20, 2025",
    category: "Case Study",
  },
];

const BlogPage = () => {
  return (
    <>
      <Helmet>
        <title>Blog - Customate.ai | AI Chatbot Platform</title>
        <meta 
          name="description" 
          content="Explore the latest articles about AI chatbots and customer support automation from Customate.ai." 
        />
      </Helmet>

      {/* Simple Header */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Our Blog
            </h1>
            <p className="mt-4 text-lg text-gray-500">
              The latest insights about AI chatbots and customer support
            </p>
          </div>
        </div>
      </div>

      {/* Blog Posts List */}
      <div className="bg-gray-50 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 pt-6">
            {blogPosts.map((post) => (
              <article 
                key={post.id}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow transition-shadow duration-300"
              >
                <div>
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                    {post.category}
                  </span>
                </div>
                <div className="mt-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    <a href="#" className="hover:text-primary-600">
                      {post.title}
                    </a>
                  </h2>
                  <p className="mt-2 text-base text-gray-500">
                    {post.excerpt}
                  </p>
                </div>
                <div className="mt-6 flex items-center">
                  <div className="flex-shrink-0">
                    <span className="inline-block h-10 w-10 rounded-full bg-primary-100 text-primary-600 text-center leading-10">
                      {post.author.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{post.author}</p>
                    <div className="text-sm text-gray-500">
                      <time dateTime="2020-03-16">{post.date}</time>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <a
                    href="#"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Read full article →
                  </a>
                </div>
              </article>
            ))}
          </div>
          
          {/* Simple Pagination */}
          <div className="mt-12 pt-8 flex justify-center border-t border-gray-200">
            <a
              href="#"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Load more articles
            </a>
          </div>
        </div>
      </div>

      {/* Simple CTA */}
      <div className="bg-primary-700">
        <div className="max-w-4xl mx-auto py-12 px-4 text-center sm:px-6 lg:py-16 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg leading-6 text-primary-100">
            Try Customate.ai today and transform your customer support experience.
          </p>
          <div className="mt-8">
            <a
              href="/pricing"
              className="inline-flex items-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50"
            >
              View pricing
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPage;