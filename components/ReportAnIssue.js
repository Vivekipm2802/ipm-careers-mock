import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardBody, CardHeader } from '@nextui-org/card';
import { Input } from '@nextui-org/input';
import { Select, SelectItem } from '@nextui-org/select';
import { Textarea } from '@nextui-org/input';
import { Button } from '@nextui-org/button';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'react-hot-toast';


const ReportIssueForm = ({onClose}) => {

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  const categories = [
    { value: 'bug', label: 'Bug' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'improvement', label: 'Improvement' },
    { value: 'documentation', label: 'Documentation' }
  ];

  const onSubmit = async (formData) => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .insert({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          tags: formData.tags?.split(',').map(tag => tag.trim()) || []
        })
        .select();

      if (error) {
        toast.error('Error submitting issue');
        return;
      }

      if (data && data.length > 0) {
        toast.success('Ticket Created, We will resolve your issue shortly.');
        reset();
        onClose();
        return;
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error submitting issue');
    }
  };

  return (
    <Card shadow='none' className="w-full mx-auto bg-transparent">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-xl font-bold">Report an Issue</p>
          <p className="text-small text-default-500">Fill out the form below to report a new issue</p>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            {...register('title', { required: 'Title is required' })}
            label="Title"
            placeholder="Enter issue title"
            isRequired
            errorMessage={errors.title?.message}
          />

          <Textarea
            {...register('description', { required: 'Description is required' })}
            label="Description"
            placeholder="Describe the issue in detail"
            isRequired
            errorMessage={errors.description?.message}
          />

          <Select
            {...register('priority')}
            label="Priority"
            placeholder="Select priority level"
            defaultSelectedKeys={['medium']}
          >
            {priorities.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </Select>

          <Select
            {...register('category')}
            label="Category"
            placeholder="Select issue category"
          >
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </Select>

          <Input
            {...register('tags')}
            label="Tags"
            placeholder="Enter tags separated by commas"
          />

          <div className="flex justify-end gap-2">
            <Button 
              color="danger" 
              variant="flat" 
              onClick={() => reset()}
              type="button"
            >
              Clear
            </Button>
            <Button 
              color="primary"
              type="submit"
              isLoading={isSubmitting}
            >
              Submit Issue
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};

export default ReportIssueForm;